export class User {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  userId: string;

  constructor(accessToken: string, expiresIn: number, refreshToken: string, userId: string) {
    this.accessToken = accessToken;
    this.expiresIn = expiresIn;
    this.refreshToken = refreshToken;
    this.userId = userId;
  }
}
