export class TimeUtils {
  static formatDuration(minutes: number): string {
    if (minutes === 0) return "0m";

    const totalMinutes = Math.floor(minutes);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalMonths = Math.floor(totalDays / 30);

    let result = "";

    if (totalMonths > 0) {
      result += `${totalMonths}mo `;
    }
    if (totalDays > 0) {
      result += `${totalDays % 30}d `;
    }
    if (totalHours > 0) {
      result += `${totalHours % 24}h `;
    }
    if (totalMinutes > 0) {
      result += `${totalMinutes % 60}m `;
    }

    return result.trim();
  }

  static getSessionDuration(startTime: number, endTime?: number): number {
    const end = endTime || Date.now();
    return Math.floor((end - startTime) / (1000 * 60));
  }

  static formatSessionTime(startTime: number): string {
    const minutes = this.getSessionDuration(startTime);
    return this.formatDuration(minutes);
  }

  static formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  static getDiscordTimestamp(timestamp: number): number {
    return Math.floor(timestamp / 1000);
  }
}
