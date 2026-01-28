export class Constants {
  public static readonly CW_CW_APP_URL: string = "https://www.chatwork.com/";
  public static readonly CW_CW_APP_PREFIX_FOR_LINK: string = "#!rid";
  public static readonly CW_LOGO_NAME: string = "cw-icon.png";
  public static readonly CW_OAUTH_SCOPE: string =
    "rooms.messages:read rooms.info:read users.tasks.me:read users.profile.me:read users.all:read users.status.me:read contacts.all:read";
  public static readonly CW_OAUTH_CL_ID: string = "y0PzMLQonNX7r";
  public static readonly CW_OAUTH_PROVIDER_NAME: string = "Chatwork";
  public static readonly CW_OAUTH_DESCRIPTION: string = "Connect your Chatwork account";
  public static readonly CW_API_URL: string = "https://api.chatwork.com/v2/";
  public static readonly CW_OAUTH_LOGIN: string = "https://www.chatwork.com/packages/oauth2/login.php";
  public static readonly CW_OAUTH_TOKEN: string = "https://oauth.chatwork.com/token";

  /**
   * resolving URL linked to specified chat
   *
   * @param roomId
   * @param chatId
   * @returns URL linked to specified chat
   */
  public static getCWAppLinkUrlForChat(roomId: number, chatId: string): string {
    return `${this.CW_CW_APP_URL}${this.CW_CW_APP_PREFIX_FOR_LINK}${roomId}-${chatId}`;
  }

  /**
   * resolving URL linked to specified rooom
   *
   * @param roomId
   * @param chatId
   * @returns URL linked to specified rooom
   */
  public static getCWAppLinkUrlForRoom(roomId: number): string {
    return `${this.CW_CW_APP_URL}${this.CW_CW_APP_PREFIX_FOR_LINK}${roomId}`;
  }
}
