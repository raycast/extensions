import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import { useEffect, useState } from "react";

export const teamSchema = z.object({
  name: z.string(),
  /**
   * Team keys carry an Issuer ID; individual keys have none. Apple signs the two
   * differently — a team key sets the `iss` claim, an individual key sets `sub: "user"`
   * and omits `iss` entirely — so absence here is what selects the individual-key path.
   * Optional (not removed) so credentials stored by earlier versions still parse.
   */
  issuerID: z.string().optional(),
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
    const filtered = parsed.filter((t) => t.apiKey !== team.apiKey);
    const newJson = JSON.stringify(filtered);
    await LocalStorage.setItem("teams", newJson);
    setTeams(await getTeams());
    const currentTeam = await getCurrentTeam();
    if (currentTeam?.apiKey === team.apiKey) {
      await removeCurrentTeam();
      const newTeams = await getTeams();
      setTeams(newTeams);
      if (newTeams && newTeams.length > 0) {
        selectCurrentTeam(newTeams[newTeams.length - 1]);
      }
    }
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
        issuerID: issuerID,
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

  const removeCurrentTeam = async () => {
    const currentTeam = await getCurrentTeam();
    if (currentTeam) {
      await LocalStorage.removeItem("teamName");
      await LocalStorage.removeItem("apiKey");
      await LocalStorage.removeItem("privateKey");
      await LocalStorage.removeItem("issuerID");
      setCurrentTeam(undefined);
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
  };
};
