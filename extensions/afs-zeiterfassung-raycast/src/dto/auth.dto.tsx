export interface LoginRequestDTO {
  /**
   * Username of the user
   */
  username: string;

  /**
   * Password of the user
   */
  password: string;
}

export interface LoginResponseDTO {
  /**
   * Access token for the user
   */
  access_token: string;

  /**
   * Refresh token for the user
   */
  refresh_token: string;
}
