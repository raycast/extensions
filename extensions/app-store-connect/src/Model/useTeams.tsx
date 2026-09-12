import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { z } from "zod";
import { isSameCredential, locateCredential, removeOneCredential } from "../Utils/credentials";
import { useEffect, useState } from "react";

// Naming rules live with the other credential-identity rules, which are Raycast-free and
// covered by Utils/credentials.test.ts; re-exported so callers have one import.
export { isUnnamed, keyDisplayName } from "../Utils/credentials";

export const teamSchema = z.object({
  name: z.string(),
  /**
   * Team keys carry an Issuer ID; individual keys have none. Apple signs the two
   * differently — a team key sets the `iss` claim, an individual key sets `sub: "user"`
   * and omits `iss` entirely — so absence here is what selects the individual-key path.
   * Optional (not removed) so credentials stored by earlier versions still parse.
   *
   * Empty string is normalized to undefined on parse. Everything else treats "" as
   * absent — `selectCurrentTeam` removes the flat key for it, the signer branches on
   * falsiness — but a raw `""` would compare unequal to `undefined` in the identity
   * check, so a record stored that way could be deleted from the list while the flat
   * selection keys still pointed at it. One representation, decided here.
   */
  issuerID: z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.length === 0 ? undefined : value)),
  apiKey: z.string(),
  privateKey: z.string(),
});

export type Team = z.infer<typeof teamSchema>;

export const teamSchemas = z.array(teamSchema);

/**
 * Stored credentials, and which one is selected.
 *
 * **Known limitation — last write wins.** Every mutation here is a read-modify-write
 * against `LocalStorage`, which offers no compare-and-swap. Two Raycast commands running
 * at once can therefore lose one of two concurrent additions, and the selection is four
 * independent keys rather than one record, so interleaved selections could in principle
 * mix one credential's name with another's key material.
 *
 * `renameTeam` exercises this directly: it reads the selection, then writes it back, so a
 * selection made by another command in between is overwritten. Same root cause, same fix.
 *
 * This is documented rather than papered over: closing it properly means storing the
 * selection as a single serialized record with a stable id, which is a storage-format
 * change needing a migration for existing users. In practice a person drives one
 * credential form at a time, so the window is small — but it is real, not absent.
 */
export const useTeams = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | undefined>(undefined);

  const getTeams = async () => {
    const teams = (await LocalStorage.getItem("teams")) as string | undefined;
    if (teams === undefined) {
      return [];
    } else {
      const json = JSON.parse(teams);
      const parsed = teamSchemas.parse(json);
      return parsed;
    }
  };

  const deleteTeam = async (team: Team) => {
    const storageTeams = (await LocalStorage.getItem("teams")) as string | undefined;
    if (storageTeams === undefined) {
      return;
    }
    const json = JSON.parse(storageTeams);
    const parsed = teamSchemas.parse(json);
    // Drops a SINGLE entry matched on the whole credential — see Utils/credentials.
    const { removed, remaining } = removeOneCredential(parsed, team);
    if (!removed) {
      return;
    }
    await LocalStorage.setItem("teams", JSON.stringify(remaining));
    setTeams(remaining);
    const currentTeam = await getCurrentTeam();
    // An identical duplicate still backs the selection, so only drop it when nothing left matches.
    if (
      currentTeam &&
      isSameCredential(currentTeam, team) &&
      !remaining.some((t) => isSameCredential(t, currentTeam))
    ) {
      await clearCurrentTeam();
      if (remaining.length > 0) {
        await selectCurrentTeam(remaining[remaining.length - 1]);
      }
    }
  };

  /**
   * Forgets every stored credential and the selection — the "sign out" path.
   *
   * Local only, like deleteTeam: nothing is revoked at Apple, and every key can be added
   * again. The whole `teams` key is removed rather than set to `[]` so storage matches a
   * fresh install exactly.
   */
  const deleteAllTeams = async () => {
    await LocalStorage.removeItem("teams");
    setTeams([]);
    await clearCurrentTeam();
  };

  /**
   * Changes a credential's local label, in place.
   *
   * Rewrites the entry at its existing index rather than removing and re-adding, so the
   * list does not reorder under the user. The name is part of a credential's identity
   * (see Utils/credentials), so a renamed record no longer matches the flat selection
   * keys — if this credential was selected, the selection is rewritten too.
   *
   * Takes the row's position, because content is not enough to identify it: two
   * byte-identical records match each other, so searching by identity renames whichever
   * comes first — the user clicks the second row and the first one changes. That is
   * invisible for a REMOVAL (dropping either of two identical entries leaves the same
   * list) but plainly wrong for a rename, which is what makes them different.
   *
   * The position comes from a previous render, so it is verified against content before
   * it is used, and falls back to a search when storage has shifted underneath.
   */
  const renameTeam = async (team: Team, position: number, name: string) => {
    const stored = await getTeams();
    const index = locateCredential(stored, team, position);
    if (index === -1) {
      return undefined;
    }
    const renamed: Team = { ...stored[index], name: name.trim() };
    const next = stored.map((candidate, i) => (i === index ? renamed : candidate));
    await LocalStorage.setItem("teams", JSON.stringify(next));
    setTeams(next);
    const selected = await getCurrentTeam();
    if (selected && isSameCredential(selected, team)) {
      await selectCurrentTeam(renamed);
    }
    return renamed;
  };

  /** Reads storage fresh — a render-time snapshot may name a credential since deleted. */
  const hasStoredTeam = async (team: Team) => {
    const stored = await getTeams();
    return stored.some((candidate) => isSameCredential(candidate, team));
  };

  const addTeam = async (team: Team) => {
    const teams = (await LocalStorage.getItem("teams")) as string | undefined;
    if (teams === undefined) {
      const newJson = JSON.stringify([team]);
      await LocalStorage.setItem("teams", newJson);
      setTeams(await getTeams());
    } else {
      const json = JSON.parse(teams);
      const parsed = teamSchemas.parse(json);
      const newJson = JSON.stringify([...parsed, team]);
      await LocalStorage.setItem("teams", newJson);
      setTeams(await getTeams());
    }
  };

  const getCurrentTeam = async () => {
    const teamName = await LocalStorage.getItem<string>("teamName");
    const apiKey = await LocalStorage.getItem<string>("apiKey");
    const privateKey = await LocalStorage.getItem<string>("privateKey");
    const issuerID = await LocalStorage.getItem<string>("issuerID");
    // issuerID is deliberately not required — an individual key has none.
    if (apiKey === undefined || privateKey === undefined || teamName === undefined) {
      return undefined;
    } else {
      return {
        name: teamName,
        // Same normalization the schema applies to the stored list: this record is
        // compared against those with isSameCredential, so "" and undefined must not
        // be two ways of saying "individual key".
        issuerID: issuerID === undefined || issuerID.length === 0 ? undefined : issuerID,
        apiKey: apiKey,
        privateKey: privateKey,
      };
    }
  };
  const selectCurrentTeam = async (team: Team) => {
    await LocalStorage.setItem("teamName", team.name);
    await LocalStorage.setItem("apiKey", team.apiKey);
    await LocalStorage.setItem("privateKey", team.privateKey);
    if (team.issuerID) {
      await LocalStorage.setItem("issuerID", team.issuerID);
    } else {
      // Must clear, not skip: these are flat top-level keys, so switching from a team
      // key to an individual one would otherwise leave the previous issuer behind and
      // sign `iss` instead of `sub` — which fails auth for a non-obvious reason.
      await LocalStorage.removeItem("issuerID");
    }
    setCurrentTeam(team);
  };

  const clearCurrentTeam = async () => {
    await LocalStorage.removeItem("teamName");
    await LocalStorage.removeItem("apiKey");
    await LocalStorage.removeItem("privateKey");
    await LocalStorage.removeItem("issuerID");
    setCurrentTeam(undefined);
  };

  const removeCurrentTeam = async () => {
    const currentTeam = await getCurrentTeam();
    if (currentTeam) {
      await clearCurrentTeam();
      await deleteTeam(currentTeam);
      setTeams(await getTeams());
    }
  };

  /**
   * Re-reads storage.
   *
   * Each mount of this hook holds its own React state, so a write made by ANOTHER
   * instance — the add-key form runs its own — is invisible to this one until it looks
   * again. Callers that push such a form reload when it reports success.
   */
  const reload = async () => {
    setTeams(await getTeams());
    setCurrentTeam(await getCurrentTeam());
  };

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (error) {
        // A stored list that cannot be parsed is a dead end for every command, so say so
        // rather than sitting on a spinner: setIsLoading lives in `finally` because the
        // throw used to skip it entirely and the command never stopped loading.
        await showFailureToast(error, { title: "Couldn't Read Stored Keys" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return {
    isLoading,
    teams,
    addTeam,
    deleteTeam,
    currentTeam,
    selectCurrentTeam,
    removeCurrentTeam,
    hasStoredTeam,
    deleteAllTeams,
    renameTeam,
    reload,
  };
};
