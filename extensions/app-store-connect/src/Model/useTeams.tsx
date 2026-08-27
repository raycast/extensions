import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import { isSameCredential, removeOneCredential } from "../Utils/credentials";
import { useEffect, useState } from "react";

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

/**
 * The name is purely a local label for the credential picker — it is never sent to
 * Apple and has no equivalent in the API. So it is optional; when left blank, fall
 * back to something self-describing and unique (the key ID distinguishes entries).
 */
export function credentialLabel(name: string, isIndividualKey: boolean, apiKey: string) {
  const trimmed = name.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `${isIndividualKey ? "Individual Key" : "Team Key"} (${apiKey})`;
}

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

  useEffect(() => {
    (async () => {
      setTeams(await getTeams());
      setCurrentTeam(await getCurrentTeam());
      setIsLoading(false);
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
  };
};
