import { listTeamMembers, listTeams } from "../fathom/api";
import type { TeamMember } from "../types/Types";
import { logger } from "@chrismessina/raycast-logger";

type Input = {
  /**
   * Filter by team name or ID
   */
  team?: string;
  /**
   * Maximum number of team members to return
   */
  limit?: number;
  /**
   * Search query to filter team members by name or email
   */
  query?: string;
  /**
   * Pagination cursor for fetching next page
   */
  cursor?: string;
};

/**
 * List Fathom team members with their names, emails, and team affiliations
 *
 * Returns a list of team members, optionally filtered by team or search query.
 * Useful for understanding team structure and identifying collaborators.
 */
export default async function tool(input: Input = {}) {
  try {
    let teamId: string | undefined;

    // If team filter is provided, resolve team name to ID
    if (input.team) {
      const teamsResult = await listTeams({});
      const matchingTeam = teamsResult.items.find(
        (team) => team.name.toLowerCase() === input.team?.toLowerCase() || team.id === input.team,
      );

      if (matchingTeam) {
        teamId = matchingTeam.id;
      }
    }

    // Fetch team members
    const result = await listTeamMembers(teamId, {
      cursor: input.cursor,
      query: input.query,
    });

    let members: TeamMember[] = result.items;

    // Apply client-side query filter if API doesn't support it
    if (input.query) {
      const queryLower = input.query.toLowerCase();
      members = members.filter((member) => {
        const name = (member.name || "").toLowerCase();
        const email = (member.email || "").toLowerCase();
        return name.includes(queryLower) || email.includes(queryLower);
      });
    }

    // Apply limit
    if (input.limit) {
      members = members.slice(0, input.limit);
    }

    // Format response
    return {
      members: members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        emailDomain: member.emailDomain,
        team: member.team,
        createdAt: member.createdAt,
      })),
      totalCount: members.length,
      nextCursor: result.nextCursor,
    };
  } catch (error) {
    logger.error("Error listing team members:", error);
    throw new Error(`Failed to list team members: ${error instanceof Error ? error.message : String(error)}`);
  }
}
