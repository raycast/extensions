export type EdgeLocalState = {
  profile: { info_cache: EdgeInfoCache };
};

export type EdgeInfoCache = { [key: string]: EdgeInfoCacheProfile };

export type EdgeInfoCacheProfile = {
  /**
   * The chrome avatar path; eg: `chrome://theme/IDR_PROFILE_AVATAR_44`.
   */
  avatar_icon: string;
  /**
   * The profile name, written by the User in the create Chrome profile tutorial window. Eg: Personal, Work, Kids.
   */
  name: string;
  /**
   * The user Edge account profile picture URL (if any).
   */
  last_downloaded_gaia_picture_url_with_size?: string;
  /**
   * The name of the user Edge account, eg: `Steve Jobs`.
   */
  gaia_name?: string;
  /**
   * The email of the user Edge account, eg: `steve.jobs@gmail.com`.
   */
  user_name?: string;
};

export type Profile = {
  /**
   * The profile name given in Edge.
   */
  name: string;
  /**
   * The folder name where the Chrome profile is stored.
   */
  directory: string;
  /**
   * The Edge Account if the user has sync the profile with a Edge account.
   */
  ga?: {
    /**
     * The EA user name.
     */
    name: string;
    /**
     * The EA user email.
     */
    email: string;
    /**
     * The EA user profile picture URL.
     */
    pictureURL: string;
  };
};
