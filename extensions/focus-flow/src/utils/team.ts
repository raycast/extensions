import type { TeamMember, DiscordEmbed, EmbedField } from "../types";

export class TeamUtils {
  static parseEmbed(embeds: DiscordEmbed[]): TeamMember[] {
    if (!embeds || embeds.length === 0) return [];

    const embed = embeds[0];
    if (!embed.fields) return [];

    return embed.fields
      .map((field: EmbedField) => {
        const match = field.value.match(/^(\d+)m(?:\s*📚\s*Started\s*<t:(\d+):R>)?/);
        if (!match) return null;

        return {
          username: field.name.replace(/🥇 |🥈 |🥉 |\d+\. /g, "").trim(),
          totalMinutes: Number.parseInt(match[1]),
          isStudying: !!match[2],
          studyStartTime: match[2] ? Number.parseInt(match[2]) * 1000 : undefined,
        };
      })
      .filter(Boolean) as TeamMember[];
  }

  static createEmbed(members: TeamMember[], teamName: string): DiscordEmbed {
    const sortedMembers = [...members].sort((a, b) => b.totalMinutes - a.totalMinutes);

    const fields = sortedMembers.map((member, index) => {
      const rank = this.getRankEmoji(index);
      let value = `${member.totalMinutes}m`;

      if (member.isStudying && member.studyStartTime) {
        const timestamp = Math.floor(member.studyStartTime / 1000);
        value += ` 📚 Started <t:${timestamp}:R>`;
      }

      return {
        name: `${rank} ${member.username}`,
        value,
        inline: false,
      };
    });

    if (fields.length === 0) {
      fields.push({
        name: "No members yet",
        value: "Invite others to join your team!",
        inline: false,
      });
    }

    return {
      title: `📚 ${teamName} Study Leaderboard`,
      color: 0x5865f2,
      fields,
      footer: {
        text: "FocusFlow • Last updated",
      },
      timestamp: new Date().toISOString(),
    };
  }

  static addMember(members: TeamMember[], username: string): TeamMember[] {
    if (members.some((m) => m.username === username)) {
      throw new Error("Username already exists in this team");
    }
    if (members.length >= 10) {
      throw new Error("Team is full (maximum 10 members)");
    }

    return [...members, { username, totalMinutes: 0, isStudying: false }];
  }

  static updateMember(members: TeamMember[], username: string, updates: Partial<TeamMember>): TeamMember[] {
    return members.map((member) => (member.username === username ? { ...member, ...updates } : member));
  }

  static resetAllTimes(members: TeamMember[]): TeamMember[] {
    return members.map((member) => ({
      ...member,
      totalMinutes: 0,
      isStudying: false,
      studyStartTime: undefined,
    }));
  }

  static generateTeamCode(messageId: string, webhookUrl: string): string {
    return `${messageId}:${webhookUrl}`;
  }

  static parseTeamCode(teamCode: string): { messageId: string; webhookUrl: string } {
    const colonIndex = teamCode.indexOf(":");
    if (colonIndex === -1) {
      throw new Error("Invalid team code format");
    }

    return {
      messageId: teamCode.substring(0, colonIndex),
      webhookUrl: teamCode.substring(colonIndex + 1),
    };
  }

  private static getRankEmoji(index: number): string {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return "";
    }
  }
}
