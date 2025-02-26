import api from "../lib/api";

type Input = {
  teamPath: string;
};

export default async function tool(input: Input) {
  return api.getTeamNotes(input.teamPath).then(notes => notes.slice(0, 50));
}
