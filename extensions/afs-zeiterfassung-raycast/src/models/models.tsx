export interface AFSPreferences {
  /**
   * server address of the api
   */
  server: string;

  /**
   * username of the User
   */
  username: string;

  /**
   * password of the user
   */
  password: string;
}

export interface StateItem {
  /**
   * id of the state
   */
  id: number;

  /**
   * title of the state
   */
  title: string;
}
