export interface paths {
  "/": {
    /** Root */
    get: operations["root__get"];
  };
  "/v1": {
    /** Version Meta */
    get: operations["_version_meta_v1_get"];
  };
  "/v1/cards/{card_id}": {
    /**
     * Get Card
     * @description Get a specified card
     */
    get: operations["_get_card_v1_cards__card_id__get"];
  };
  "/v1/cards/get/select": {
    /**
     * Get Selected Cards
     * @description The "base query" for retrieving cards (memberships) – supports selecting, filtering, and
     * ordering by any implemented metric
     *
     * NOTE: This is a "POST-GET" endpoint – the method is POST (for the payload) but it GETs data
     */
    post: operations["_get_selected_cards_v1_cards_get_select_post"];
  };
  "/v1/cards/get/specify": {
    /**
     * Get Specified Cards
     * @description Get the full card memberships of all the card IDs passed in the request body
     *
     * NOTE: This is a "POST-GET" endpoint – the method is POST (for the payload) but it GETs data
     */
    post: operations["_get_specified_cards_v1_cards_get_specify_post"];
  };
  "/v1/cards/get/deleted": {
    /**
     * Get Deleted Cards
     * @description Get a list of recently deleted card IDs for this user
     */
    get: operations["_get_deleted_cards_v1_cards_get_deleted_get"];
  };
  "/v1/cards/simple": {
    /**
     * Simple Create Card
     * @description Create a single card with the minimum amount of data required
     */
    post: operations["_simple_create_card_v1_cards_simple_post"];
  };
  "/v1/cards/simple/{card_id}/append": {
    /**
     * Simple Append
     * @description Append content to an existing card
     */
    put: operations["_simple_append_v1_cards_simple__card_id__append_put"];
  };
  "/v1/cards/daily": {
    /** Daily Append */
    put: operations["_daily_append_v1_cards_daily_put"];
  };
  "/v1/cards": {
    /**
     * Create Cards
     * @description Create cards with full control over properties
     */
    post: operations["_create_cards_v1_cards_post"];
    /**
     * Update Cards
     * @description Update many cards in one call
     */
    patch: operations["_update_cards_v1_cards_patch"];
  };
  "/v1/cards/enroll/{card_id}": {
    /**
     * Enroll In Card
     * @description Enroll in a card – the current user will be given access to all child cards(that have been
     * published) within the specified card. If the user has already enrolled, this endpoint will
     * return all child cards to provide idempotency.
     */
    put: operations["_enroll_in_card_v1_cards_enroll__card_id__put"];
  };
  "/v1/cards/remove": {
    /**
     * Remove Cards For Me
     * @description Completely remove access to cards for the current user
     */
    post: operations["_remove_cards_for_me_v1_cards_remove_post"];
  };
  "/v1/cards/delete": {
    /**
     * Delete Cards For Everyone
     * @description Completely (and irreversibly) delete cards from the Supernotes platform
     */
    post: operations["_delete_cards_for_everyone_v1_cards_delete_post"];
  };
  "/v1/collections": {
    /**
     * Get Collections
     * @description Get all collections owned by the user
     */
    get: operations["_get_collections_v1_collections_get"];
  };
  "/v1/collections/deleted": {
    /**
     * Get Deleted Collections
     * @description Get the IDs of collections deleted by the user
     */
    get: operations["_get_deleted_collections_v1_collections_deleted_get"];
  };
  "/v1/collections/{collection_id}": {
    /**
     * Get Collection
     * @description Get the specified collection
     */
    get: operations["_get_collection_v1_collections__collection_id__get"];
    /**
     * Create Collection
     * @description Create a custom collection
     */
    post: operations["_create_collection_v1_collections__collection_id__post"];
    /**
     * Delete Collection
     * @description Delete the specified collection
     */
    delete: operations["_delete_collection_v1_collections__collection_id__delete"];
    /**
     * Update Collection
     * @description Update the specified collection
     */
    patch: operations["_update_collection_v1_collections__collection_id__patch"];
  };
  "/v1/comments/{card_id}": {
    /**
     * Get Comments
     * @description Get all comments for the specified card
     */
    get: operations["_get_comments_v1_comments__card_id__get"];
  };
  "/v1/comments/{card_id}/{comment_id}": {
    /**
     * Edit Comment
     * @description Update the specified comment on the specified card
     */
    put: operations["_edit_comment_v1_comments__card_id___comment_id__put"];
    /**
     * Create Comment
     * @description Create a new comment on the specified card
     */
    post: operations["_create_comment_v1_comments__card_id___comment_id__post"];
    /**
     * Delete Comment
     * @description Delete the specified comment from the specified card
     */
    delete: operations["_delete_comment_v1_comments__card_id___comment_id__delete"];
  };
  "/v1/friends": {
    /** Get Friends */
    get: operations["_get_friends_v1_friends_get"];
    /** Send Friend Request */
    post: operations["_send_friend_request_v1_friends_post"];
  };
  "/v1/friends/incoming": {
    /** Get Incoming Requests */
    get: operations["_get_incoming_requests_v1_friends_incoming_get"];
  };
  "/v1/friends/outgoing": {
    /** Get Outgoing Requests */
    get: operations["_get_outgoing_requests_v1_friends_outgoing_get"];
  };
  "/v1/friends/{other_user_id}": {
    /** Accept Friendship */
    put: operations["_accept_friendship_v1_friends__other_user_id__put"];
    /** Delete Friendship */
    delete: operations["_delete_friendship_v1_friends__other_user_id__delete"];
  };
  "/v1/keys": {
    /**
     * Get User Api Keys
     * @description Get all API keys for the user
     */
    get: operations["_get_user_api_keys_v1_keys_get"];
    /**
     * Modify Api Key
     * @description Modify an API key for the user
     */
    put: operations["_modify_api_key_v1_keys_put"];
    /**
     * Create Api Key
     * @description Create a new API key for the user
     */
    post: operations["_create_api_key_v1_keys_post"];
  };
  "/v1/keys/delete": {
    /**
     * Delete Api Key
     * @description Delete an API key for the user
     */
    post: operations["_delete_api_key_v1_keys_delete_post"];
  };
  "/v1/keys/email": {
    /**
     * Get User Sending Email
     * @description Get the user's email-sending key
     */
    get: operations["_get_user_sending_email_v1_keys_email_get"];
    /**
     * Create User Sending Email
     * @description Create a new email-sending key for a user
     */
    post: operations["_create_user_sending_email_v1_keys_email_post"];
    /**
     * Delete User Sending Email
     * @description Delete a user's email-sending key
     */
    delete: operations["_delete_user_sending_email_v1_keys_email_delete"];
  };
  "/v1/members/{card_id}": {
    /**
     * Get Members
     * @description Get data about members of this card (permissions, statuses, etc)
     */
    get: operations["_get_members_v1_members__card_id__get"];
  };
  "/v1/members/{card_id}/attempt-join": {
    /**
     * Attempt Join
     * @description Attempt to join a card (based on having access to some arbitrary ancestor card)
     */
    post: operations["_attempt_join_v1_members__card_id__attempt_join_post"];
  };
  "/v1/members/{card_id}/invite/{user_id}": {
    /**
     * Invite Member
     * @description Invite a friend directly to an existing card
     */
    post: operations["_invite_member_v1_members__card_id__invite__user_id__post"];
  };
  "/v1/members/{card_id}/invite/{invite_response}": {
    /**
     * Respond To Invite
     * @description Respond to a card invitation
     */
    put: operations["_respond_to_invite_v1_members__card_id__invite__invite_response__put"];
  };
  "/v1/members/{card_id}/{target_user_id}": {
    /**
     * Modify Member
     * @description Update another user's card membership
     */
    put: operations["_modify_member_v1_members__card_id___target_user_id__put"];
    /**
     * Delete Member
     * @description Delete the member from the specified card
     */
    delete: operations["_delete_member_v1_members__card_id___target_user_id__delete"];
  };
  "/v1/profiles": {
    /**
     * Get Current User Profile
     * @description Get the authenticated user's public profile
     */
    get: operations["_get_current_user_profile_v1_profiles_get"];
  };
  "/v1/profiles/known": {
    /**
     * Get Known Owner Profiles
     * @description Get the public profiles for all card owners the current user knows
     */
    get: operations["_get_known_owner_profiles_v1_profiles_known_get"];
  };
  "/v1/profiles/{user_id}": {
    /**
     * Get Other User Profile
     * @description Get the specified user's public profile
     */
    get: operations["_get_other_user_profile_v1_profiles__user_id__get"];
  };
  "/v1/profiles/specify": {
    /**
     * Get Specified User Profiles
     * @description Get the public profiles for a specified list of users
     */
    post: operations["_get_specified_user_profiles_v1_profiles_specify_post"];
  };
  "/v1/synth/credits": {
    /**
     * Get Synth Credits
     * @description Get the number of synthetic credits the user has
     */
    get: operations["_get_synth_credits_v1_synth_credits_get"];
  };
  "/v1/sharing/{card_id}": {
    /** Get Share Codes For Card */
    get: operations["_get_share_codes_for_card_v1_sharing__card_id__get"];
    /**
     * Create Share Code
     * @description Create a new share code (if user has permission)
     */
    post: operations["_create_share_code_v1_sharing__card_id__post"];
  };
  "/v1/sharing/{card_id}/{share_code_id}": {
    /**
     * Update Share Code
     * @description Modify an existing share code (if user has permission)
     */
    put: operations["_update_share_code_v1_sharing__card_id___share_code_id__put"];
    /**
     * Delete Share Code
     * @description Delete an existing share code (if user has permission)
     */
    delete: operations["_delete_share_code_v1_sharing__card_id___share_code_id__delete"];
  };
  "/v1/sharing/code/{code}": {
    /**
     * Find Card With Share Code
     * @description Retrieve card data (and share code metadata) by specifying a share code.
     */
    get: operations["_find_card_with_share_code_v1_sharing_code__code__get"];
  };
  "/v1/sharing/code/{code}/authed": {
    /**
     * Authed Find Card With Share Code
     * @description Retrieve card data (and share code metadata) by specifying a share code.
     * Check for auth headers and if the user already has access to this card, return a 409 error.
     */
    get: operations["_authed_find_card_with_share_code_v1_sharing_code__code__authed_get"];
  };
  "/v1/sharing/code/{code}/join": {
    /**
     * Join Card With Share Code
     * @description Join a card via share code (if allowed)
     */
    post: operations["_join_card_with_share_code_v1_sharing_code__code__join_post"];
  };
  "/v1/tags": {
    /**
     * Get Users Tags
     * @description Get all tags known to the user
     */
    get: operations["_get_users_tags_v1_tags_get"];
  };
  "/v1/templates": {
    /**
     * Get All Templates
     * @description Get all templates for this user
     */
    get: operations["_get_all_templates_v1_templates_get"];
  };
  "/v1/templates/{template_id}": {
    /**
     * Edit Template
     * @description Update the specified template
     */
    put: operations["_edit_template_v1_templates__template_id__put"];
    /**
     * Create Template
     * @description Create a new template
     */
    post: operations["_create_template_v1_templates__template_id__post"];
    /**
     * Delete Template
     * @description Delete the specified template
     */
    delete: operations["_delete_template_v1_templates__template_id__delete"];
  };
  "/v1/user/prefs": {
    /**
     * Set Preferences
     * @description Sets multiple preferences for the user
     */
    patch: operations["_set_preferences_v1_user_prefs_patch"];
  };
  "/v1/user/prefs/flag/{pref_flag}": {
    /**
     * Set Preference Flag
     * @description Sets a boolean preference flag for the user
     */
    put: operations["_set_preference_flag_v1_user_prefs_flag__pref_flag__put"];
  };
  "/v1/user/prefs/feature-preview/{feature_flag}": {
    /**
     * Set Feature Preview Flag
     * @description Sets a boolean feature preview flag for the user
     */
    put: operations["_set_feature_preview_flag_v1_user_prefs_feature_preview__feature_flag__put"];
  };
  "/v1/user/emails": {
    /**
     * Get User Email Addresses
     * @description Get all emails for a user
     */
    get: operations["_get_user_email_addresses_v1_user_emails_get"];
  };
  "/v1/user/emails/{email_id}": {
    /** Get Email */
    get: operations["_get_email_v1_user_emails__email_id__get"];
    /** Delete Email */
    delete: operations["_delete_email_v1_user_emails__email_id__delete"];
  };
  "/v1/user/emails/{email_id}/primary": {
    /** Make Email Primary */
    put: operations["_make_email_primary_v1_user_emails__email_id__primary_put"];
  };
  "/v1/user/token": {
    /**
     * Check Auth
     * @description Check if using a valid authentication token and return the associated User ID
     */
    get: operations["_check_auth_v1_user_token_get"];
  };
  "/v1/user/token/fresh": {
    /**
     * Check If Fresh Access Token
     * @description Check if the access token is 'fresh' and return the associated User ID
     */
    get: operations["_check_if_fresh_access_token_v1_user_token_fresh_get"];
  };
  "/v1/user": {
    /**
     * Get Current User
     * @description Get the authenticated user's information, including subscription details
     */
    get: operations["_get_current_user_v1_user_get"];
    /**
     * Update Current User
     * @description Update the authenticated user's personal information
     */
    put: operations["_update_current_user_v1_user_put"];
  };
  "/v1/user/bio-and-pic": {
    /**
     * Update Current User Bio And Pic
     * @description Update a public user's profile bio and image
     */
    put: operations["_update_current_user_bio_and_pic_v1_user_bio_and_pic_put"];
  };
  "/v1/user/pins": {
    /**
     * Get Pins
     * @description Get the authenticated user's pins
     */
    get: operations["_get_pins_v1_user_pins_get"];
    /**
     * Update Pins
     * @description Modify which cards the user has 'pinned'
     */
    put: operations["_update_pins_v1_user_pins_put"];
  };
  "/v1/webhooks": {
    /** Get User Webhooks */
    get: operations["_get_user_webhooks_v1_webhooks_get"];
    /** Create Webhook */
    post: operations["_create_webhook_v1_webhooks_post"];
  };
  "/v1/webhooks/{webhook_id}": {
    /** Modify Webhook */
    put: operations["_modify_webhook_v1_webhooks__webhook_id__put"];
    /** Delete Webhook */
    delete: operations["_delete_webhook_v1_webhooks__webhook_id__delete"];
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    /**
     * AccessLevel
     * @enum {integer}
     */
    AccessLevel: -1 | 0 | 1 | 2 | 3;
    /** ApiKeyResponse */
    ApiKeyResponse: {
      /** Data */
      data: string;
      /** Enabled */
      enabled: boolean;
      /** Expires When */
      expires_when: string | null;
      /** Last Used When */
      last_used_when: string | null;
    };
    /**
     * AppearanceMode
     * @enum {integer}
     */
    AppearanceMode: -1 | 0 | 1;
    /**
     * AppearanceTheme
     * @enum {integer}
     */
    AppearanceTheme: 1 | 2 | 3 | 4;
    /** ArchivedParentIdsFilter */
    ArchivedParentIdsFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "archived_parent_ids";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "contains";
      /**
       * Arg
       * Format: uuid
       */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** AuthCheckResponse */
    AuthCheckResponse: {
      /**
       * User Id
       * Format: uuid
       */
      user_id: string;
    };
    /** AuthorFilter */
    AuthorFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "author";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "equals";
      /**
       * Arg
       * Format: uuid
       */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /**
     * BackendFilterGroupOperator
     * @enum {string}
     */
    BackendFilterGroupOperator: "and" | "or";
    /** BackendFilterGroupSchema */
    BackendFilterGroupSchema: {
      operator: components["schemas"]["BackendFilterGroupOperator"];
      /** Filters */
      filters: (
        | components["schemas"]["StringFilter"]
        | components["schemas"]["IntFilter"]
        | components["schemas"]["BoolFilter"]
        | components["schemas"]["BackendFilterGroupSchema"]
      )[];
    };
    /**
     * BackendFilterOperator
     * @enum {string}
     */
    BackendFilterOperator:
      | "equals"
      | "does_not_equal"
      | "greater_than"
      | "less_than"
      | "contains"
      | "does_not_contain";
    /** BacklinkIdsFilter */
    BacklinkIdsFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "backlink_ids";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "contains";
      /**
       * Arg
       * Format: uuid
       */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** Body__delete_api_key_v1_keys_delete_post */
    Body__delete_api_key_v1_keys_delete_post: {
      /** Api Key */
      api_key: string;
    };
    /** Body__invite_member_v1_members__card_id__invite__user_id__post */
    Body__invite_member_v1_members__card_id__invite__user_id__post: {
      /** @default 1318 */
      perms?: components["schemas"]["Role"];
    };
    /** Body__modify_member_v1_members__card_id___target_user_id__put */
    Body__modify_member_v1_members__card_id___target_user_id__put: {
      /** New Perms */
      new_perms: number;
    };
    /** Body__send_friend_request_v1_friends_post */
    Body__send_friend_request_v1_friends_post: {
      /** Email Or Username */
      email_or_username: string;
    };
    /** Body__set_feature_preview_flag_v1_user_prefs_feature_preview__feature_flag__put */
    Body__set_feature_preview_flag_v1_user_prefs_feature_preview__feature_flag__put: {
      /** Flag Value */
      flag_value: boolean;
    };
    /** Body__set_preference_flag_v1_user_prefs_flag__pref_flag__put */
    Body__set_preference_flag_v1_user_prefs_flag__pref_flag__put: {
      /** Pref Value */
      pref_value: boolean;
    };
    /** BoolFilter */
    BoolFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "liked";
      /** Operator */
      operator: "equals" | "does_not_equal";
      /** Arg */
      arg: boolean;
    };
    /** CardIdFilterScalar */
    CardIdFilterScalar: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "card_id";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "equals";
      /**
       * Arg
       * Format: uuid
       */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** CardIdFilterVector */
    CardIdFilterVector: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "card_id";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "within";
      /** Arg */
      arg: string[];
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** ChildCountFilter */
    ChildCountFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "child_count";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal";
      /** Arg */
      arg: number;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** CollectionResponse */
    CollectionResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Spec */
      spec:
        | components["schemas"]["CollectionSpecReference"]
        | components["schemas"]["CollectionSpecDefined-Output"];
      view?: components["schemas"]["StoredViewData"] | null;
      /**
       * Created When
       * Format: date-time
       */
      created_when: string;
      /** Order */
      order?: string | null;
      /** Modified When */
      modified_when?: string | null;
    };
    /** CollectionSpecDefined */
    "CollectionSpecDefined-Input": {
      /** Name */
      name: string;
      /** Description */
      description: string;
      /** Icon */
      icon: string;
      filter_group: components["schemas"]["FilterGroup-Input"];
      color?: components["schemas"]["CoreColor"] | null;
    };
    /** CollectionSpecDefined */
    "CollectionSpecDefined-Output": {
      /** Name */
      name: string;
      /** Description */
      description: string;
      /** Icon */
      icon: string;
      filter_group: components["schemas"]["FilterGroup-Output"];
      color?: components["schemas"]["CoreColor"] | null;
    };
    /** CollectionSpecReference */
    CollectionSpecReference: {
      pre_id: components["schemas"]["PreconfiguredCollectionId"];
    };
    /** ColorFilterScalar */
    ColorFilterScalar: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "color";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "equals";
      arg?: components["schemas"]["CoreColor"] | null;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** ColorFilterVector */
    ColorFilterVector: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "color";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "within";
      /** Arg */
      arg: components["schemas"]["CoreColor"][];
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** CommentCountFilter */
    CommentCountFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "comment_count";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal";
      /** Arg */
      arg: number;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** CommentResponse */
    CommentResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Card Id
       * Format: uuid
       */
      card_id: string;
      /**
       * User Id
       * Format: uuid
       */
      user_id: string;
      /** Markup */
      markup: string;
      /** Html */
      html: string;
      /**
       * Created When
       * Format: date-time
       */
      created_when: string;
      /** Modified When */
      modified_when?: string | null;
    };
    /** CompleteCardResponse */
    CompleteCardResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Name */
      name: string;
      /** Html */
      html: string;
      color: components["schemas"]["CoreColor"] | null;
      /** Icon */
      icon: string | null;
      /** Tags */
      tags: string[];
      /**
       * Owner Id
       * Format: uuid
       */
      owner_id: string;
      /**
       * Created When
       * Format: date-time
       */
      created_when: string;
      /**
       * Modified When
       * Format: date-time
       */
      modified_when: string;
      owner: components["schemas"]["PublicOwnerResponse"];
      /** Trusted */
      trusted: boolean;
      /** Likes */
      likes: number;
      /** Comment Count */
      comment_count: number;
      /** Public Child Count */
      public_child_count: number;
    };
    /** CompleteShareResponse */
    CompleteShareResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Card Id
       * Format: uuid
       */
      card_id: string;
      /**
       * Owner Id
       * Format: uuid
       */
      owner_id: string;
      /** Code */
      code: string;
      granted_perms: components["schemas"]["Role"];
      card: components["schemas"]["CompleteCardResponse"];
    };
    /** ContentFilter */
    ContentFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "content";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "contains" | "within" | "regex";
      /** Arg */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /**
     * CoreColor
     * @enum {string}
     */
    CoreColor: "blue" | "green" | "orange" | "pink" | "purple" | "red" | "yellow";
    /** DailyAppend */
    DailyAppend: {
      /** Markup */
      markup: string;
      /**
       * Format
       * @default todo
       * @enum {string}
       */
      format?: "plain" | "todo";
      /** Parent Id */
      parent_id?: string | null;
      /**
       * Tags
       * @default []
       */
      tags?: string[];
      /** Local Date */
      local_date?: string | null;
    };
    /** DatetimeRangeSchema */
    DatetimeRangeSchema: {
      /**
       * From When
       * Format: date-time
       */
      from_when?: string;
      /**
       * To When
       * Format: date-time
       */
      to_when?: string;
    };
    /** EmailAddressResponse */
    EmailAddressResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Email
       * Format: email
       */
      email: string;
      /** Verified When */
      verified_when: string | null;
      /** Primary */
      primary: boolean;
    };
    /** ExtendedCardDataResponse */
    ExtendedCardDataResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Owner Id
       * Format: uuid
       */
      owner_id: string;
      /** Name */
      name: string;
      /** Markup */
      markup: string;
      /** Html */
      html: string;
      /** Ydoc */
      ydoc: string;
      /** Icon */
      icon: string | null;
      /** Tags */
      tags: string[];
      color: components["schemas"]["CoreColor"] | null;
      /**
       * Created When
       * Format: date-time
       */
      created_when: string;
      /**
       * Modified When
       * Format: date-time
       */
      modified_when: string;
      /**
       * Modified By Id
       * Format: uuid
       */
      modified_by_id: string;
      /**
       * Synced When
       * Format: date-time
       */
      synced_when: string;
      /** Meta */
      meta: {
        [key: string]: string | number | boolean;
      };
      /** Targeted When */
      targeted_when: string | null;
      /** Comment Count */
      comment_count: number;
      /** Likes */
      likes: number;
      /** Member Count */
      member_count: number;
      /** Public Child Count */
      public_child_count: number;
    };
    /** ExtendedCardMembershipResponse */
    ExtendedCardMembershipResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Liked */
      liked: boolean | null;
      /** Personal Tags */
      personal_tags: string[];
      personal_color: components["schemas"]["CoreColor"] | null;
      perms: components["schemas"]["Role"];
      via_type: components["schemas"]["MembershipCreatedVia"];
      /** Via Id */
      via_id: string | null;
      /**
       * Created When
       * Format: date-time
       */
      created_when: string;
      /**
       * Modified When
       * Format: date-time
       */
      modified_when: string;
      /** Enrolled When */
      enrolled_when: string | null;
      /** Opened When */
      opened_when: string | null;
      /** Auto Publish Children */
      auto_publish_children: boolean | null;
      view: components["schemas"]["StoredViewData"] | null;
      visibility: components["schemas"]["Visibility"];
      status: components["schemas"]["Status"];
      /** Total Child Count */
      total_child_count: number;
      /** Share Link Count */
      share_link_count: number;
    };
    /** ExtendedCardParentResponse */
    ExtendedCardParentResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Owner Id
       * Format: uuid
       */
      owner_id: string;
      /**
       * Parent Id
       * Format: uuid
       */
      parent_id: string;
      /**
       * Child Id
       * Format: uuid
       */
      child_id: string;
      /**
       * Created When
       * Format: date-time
       */
      created_when: string;
      publishing_perms: components["schemas"]["Role"] | null;
      /** Archived */
      archived: boolean | null;
      parent_membership_status: components["schemas"]["Status"];
    };
    /** ExtendedSelectCriteria */
    ExtendedSelectCriteria: {
      /** Include Membership Statuses */
      include_membership_statuses?: components["schemas"]["Status"][] | null;
      /** Parent Id */
      parent_id?: string | null;
      /** Search */
      search?: string | null;
      /** Filter Group */
      filter_group?:
        | components["schemas"]["BackendFilterGroupSchema"]
        | components["schemas"]["FilterGroup-Input"]
        | null;
      /** Include */
      include?: string[] | null;
      /** Exclude */
      exclude?: string[] | null;
      /** Changed Since */
      changed_since?: string | null;
      targeted_or_created_when?: components["schemas"]["DatetimeRangeSchema"] | null;
      created_when?: components["schemas"]["DatetimeRangeSchema"] | null;
      modified_when?: components["schemas"]["DatetimeRangeSchema"] | null;
      sort_type?: components["schemas"]["SortType"] | null;
      /** Sort Ascending */
      sort_ascending?: boolean | null;
      /** Limit */
      limit?: number | null;
    };
    /**
     * FeaturePreviewFlag
     * @enum {integer}
     */
    FeaturePreviewFlag: 1 | 2;
    /** FilterGroup */
    "FilterGroup-Input": {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "group";
      op: components["schemas"]["FilterGroupOperator"];
      /** Filters */
      filters: (
        | components["schemas"]["FilterGroup-Input"]
        | (
            | components["schemas"]["CardIdFilterScalar"]
            | components["schemas"]["CardIdFilterVector"]
          )
        | components["schemas"]["NameFilter"]
        | components["schemas"]["MarkupFilter"]
        | components["schemas"]["ContentFilter"]
        | components["schemas"]["AuthorFilter"]
        | components["schemas"]["MemberCountFilter"]
        | components["schemas"]["TagFilter"]
        | components["schemas"]["TagCountFilter"]
        | components["schemas"]["ChildCountFilter"]
        | components["schemas"]["ParentCountFilter"]
        | components["schemas"]["CommentCountFilter"]
        | components["schemas"]["ShareLinkCountFilter"]
        | components["schemas"]["LikedFilter"]
        | (
            | components["schemas"]["StatusFilterScalar"]
            | components["schemas"]["StatusFilterVector"]
          )
        | (components["schemas"]["ColorFilterScalar"] | components["schemas"]["ColorFilterVector"])
        | components["schemas"]["VisibilityFilter"]
        | components["schemas"]["PermsFilter"]
        | components["schemas"]["ParentIdsFilter"]
        | components["schemas"]["ArchivedParentIdsFilter"]
        | components["schemas"]["PublishedParentIdsFilter"]
        | components["schemas"]["BacklinkIdsFilter"]
      )[];
    };
    /** FilterGroup */
    "FilterGroup-Output": {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "group";
      op: components["schemas"]["FilterGroupOperator"];
      /** Filters */
      filters: (
        | components["schemas"]["FilterGroup-Output"]
        | (
            | components["schemas"]["CardIdFilterScalar"]
            | components["schemas"]["CardIdFilterVector"]
          )
        | components["schemas"]["NameFilter"]
        | components["schemas"]["MarkupFilter"]
        | components["schemas"]["ContentFilter"]
        | components["schemas"]["AuthorFilter"]
        | components["schemas"]["MemberCountFilter"]
        | components["schemas"]["TagFilter"]
        | components["schemas"]["TagCountFilter"]
        | components["schemas"]["ChildCountFilter"]
        | components["schemas"]["ParentCountFilter"]
        | components["schemas"]["CommentCountFilter"]
        | components["schemas"]["ShareLinkCountFilter"]
        | components["schemas"]["LikedFilter"]
        | (
            | components["schemas"]["StatusFilterScalar"]
            | components["schemas"]["StatusFilterVector"]
          )
        | (components["schemas"]["ColorFilterScalar"] | components["schemas"]["ColorFilterVector"])
        | components["schemas"]["VisibilityFilter"]
        | components["schemas"]["PermsFilter"]
        | components["schemas"]["ParentIdsFilter"]
        | components["schemas"]["ArchivedParentIdsFilter"]
        | components["schemas"]["PublishedParentIdsFilter"]
        | components["schemas"]["BacklinkIdsFilter"]
      )[];
    };
    /**
     * FilterGroupOperator
     * @enum {string}
     */
    FilterGroupOperator: "and" | "or";
    /** FriendshipResponse */
    FriendshipResponse: {
      other_user: components["schemas"]["UserPublicProfile"];
      /**
       * Modified When
       * Format: date-time
       */
      modified_when: string;
    };
    /**
     * HapticThreshold
     * @enum {integer}
     */
    HapticThreshold: 0 | 1 | 2 | 3;
    /**
     * IndentType
     * @enum {integer}
     */
    IndentType: 0 | 1 | 2;
    /** IntFilter */
    IntFilter: {
      /** Type */
      type: "child_count" | "parent_count";
      operator: components["schemas"]["BackendFilterOperator"];
      /** Arg */
      arg: number;
    };
    /** LikedFilter */
    LikedFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "liked";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "equals";
      /** Arg */
      arg: boolean;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** MarkupFilter */
    MarkupFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "markup";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "contains" | "within" | "regex";
      /** Arg */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** Member */
    Member: {
      status: components["schemas"]["Status"];
      perms: components["schemas"]["Role"];
      /** Via Id */
      via_id: string | null;
    };
    /** MemberCountFilter */
    MemberCountFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "member_count";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal";
      /** Arg */
      arg: number;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /**
     * MembershipCreatedVia
     * @enum {integer}
     */
    MembershipCreatedVia: 0 | 1 | 2 | 3;
    /** NameFilter */
    NameFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "name";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "contains" | "within" | "regex";
      /** Arg */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** ParentCountFilter */
    ParentCountFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "parent_count";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal";
      /** Arg */
      arg: number;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** ParentIdsFilter */
    ParentIdsFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "parent_ids";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "contains";
      /**
       * Arg
       * Format: uuid
       */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** PatchCollection */
    PatchCollection: {
      /** Spec */
      spec?:
        | components["schemas"]["CollectionSpecReference"]
        | components["schemas"]["CollectionSpecDefined-Input"]
        | null;
      view?: components["schemas"]["StoredViewData"] | null;
      /** Order */
      order?: string | null;
    };
    /**
     * Perm
     * @enum {integer}
     */
    Perm: 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;
    /** PermsFilter */
    PermsFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "perms";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "can";
      arg: components["schemas"]["Perm"];
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** PostCollection */
    PostCollection: {
      /** Spec */
      spec:
        | components["schemas"]["CollectionSpecReference"]
        | components["schemas"]["CollectionSpecDefined-Input"];
      view?: components["schemas"]["StoredViewData"] | null;
    };
    /** PostComment */
    PostComment: {
      /** Markup */
      markup: string;
      /** Html */
      html: string;
      /** Created When */
      created_when?: string | null;
    };
    /** PostSimpleCard */
    PostSimpleCard: {
      /** Name */
      name: string;
      /** Markup */
      markup: string;
      color?: components["schemas"]["CoreColor"] | null;
      /** Icon */
      icon?: string | null;
      /**
       * Tags
       * @default []
       */
      tags?: string[];
      /**
       * Parent Ids
       * @default []
       */
      parent_ids?: string[];
      /** Source */
      source?: string | null;
      /** Meta */
      meta?: {
        [key: string]: string | number | boolean;
      } | null;
    };
    /** PostTemplate */
    PostTemplate: {
      /** Id */
      id?: string | null;
      /** Name */
      name: string;
      /** Markup */
      markup: string;
      /** Created When */
      created_when: string | null;
    };
    /** PostWebhook */
    PostWebhook: {
      /** Url */
      url: string;
    };
    /**
     * PreconfiguredCollectionId
     * @enum {string}
     */
    PreconfiguredCollectionId: "thoughts" | "tasks" | "green" | "images";
    /**
     * PrefFlag
     * @enum {integer}
     */
    PrefFlag: 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192;
    /** PublicOwnerResponse */
    PublicOwnerResponse: {
      /** First Name */
      first_name: string;
      /** Last Name */
      last_name: string;
      /** Photo */
      photo: string | null;
    };
    /** PublishedParentIdsFilter */
    PublishedParentIdsFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "published_parent_ids";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "contains";
      /**
       * Arg
       * Format: uuid
       */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** PutApiKey */
    PutApiKey: {
      /** Data */
      data: string;
      /** Enabled */
      enabled: boolean;
    };
    /** PutComment */
    PutComment: {
      /** Markup */
      markup: string;
      /** Html */
      html: string;
    };
    /** PutTemplate */
    PutTemplate: {
      /** Name */
      name: string;
      /** Markup */
      markup: string;
    };
    /** PutWebhook */
    PutWebhook: {
      /** Url */
      url?: string;
      /** Enabled */
      enabled?: boolean;
    };
    /**
     * RevenuecatSubMethod
     * @enum {string}
     */
    RevenuecatSubMethod: "APP_STORE" | "PLAY_STORE";
    /** RevenuecatSubResponse */
    RevenuecatSubResponse: {
      type: components["schemas"]["SubscriptionDuration"];
      /**
       * Started When
       * Format: date-time
       */
      started_when: string;
      /** Expires When */
      expires_when: string | null;
      /** Will Renew */
      will_renew: boolean;
      /**
       * Source
       * @constant
       * @enum {string}
       */
      source: "revenuecat";
      /** Revenuecat Subscription Id */
      revenuecat_subscription_id: string | null;
      method: components["schemas"]["RevenuecatSubMethod"];
      /** Price */
      price: number | null;
      /** Currency */
      currency: string | null;
    };
    /**
     * Role
     * @enum {integer}
     */
    Role: -1 | 0 | 1318 | 1382 | 1398 | 4094 | 8190;
    /** ShareCodeRequest */
    ShareCodeRequest: {
      granted_perms: components["schemas"]["Role"];
    };
    /** ShareCodeResponse */
    ShareCodeResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Card Id
       * Format: uuid
       */
      card_id: string;
      /**
       * Owner Id
       * Format: uuid
       */
      owner_id: string;
      /** Code */
      code: string;
      granted_perms: components["schemas"]["Role"];
    };
    /** ShareLinkCountFilter */
    ShareLinkCountFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "share_link_count";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal";
      /** Arg */
      arg: number;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /**
     * SortType
     * @enum {integer}
     */
    SortType: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
    /**
     * Status
     * @enum {integer}
     */
    Status: -2 | -1 | 0 | 1 | 2;
    /** StatusFilterScalar */
    StatusFilterScalar: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "status";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "equals";
      arg: components["schemas"]["Status"];
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** StatusFilterVector */
    StatusFilterVector: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "status";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "within";
      /** Arg */
      arg: components["schemas"]["Status"][];
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** StoredViewData */
    StoredViewData: {
      display_type: components["schemas"]["ViewDisplayType"];
      sort_type: components["schemas"]["SortType"];
      /** Sort Ascending */
      sort_ascending: boolean;
      /**
       * Broadsheet Cols
       * @default null
       */
      broadsheet_cols?: number | null;
    };
    /** StringFilter */
    StringFilter: {
      /** Type */
      type: "author" | "name" | "content" | "tag";
      operator: components["schemas"]["BackendFilterOperator"];
      /** Arg */
      arg: string;
    };
    /** StripeSubResponse */
    StripeSubResponse: {
      type: components["schemas"]["SubscriptionDuration"];
      /**
       * Started When
       * Format: date-time
       */
      started_when: string;
      /** Expires When */
      expires_when: string | null;
      /** Will Renew */
      will_renew: boolean;
      /**
       * Source
       * @constant
       * @enum {string}
       */
      source: "stripe";
      /** Stripe Subscription Id */
      stripe_subscription_id: string | null;
    };
    /**
     * SubscriptionDuration
     * @enum {integer}
     */
    SubscriptionDuration: 1 | 2 | 3 | 4;
    /** SuccessMessage */
    SuccessMessage: {
      /** Success */
      success: string;
    };
    /** SynthCreditsResponse */
    SynthCreditsResponse: {
      /** Credits */
      credits: number;
    };
    /** TagCountFilter */
    TagCountFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "tag_count";
      /**
       * Op
       * @enum {string}
       */
      op: "equals" | "greater_than" | "greater_than_or_equal" | "less_than" | "less_than_or_equal";
      /** Arg */
      arg: number;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** TagFilter */
    TagFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "tag";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "contains";
      /** Arg */
      arg: string;
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** TemplateResponse */
    TemplateResponse: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Name */
      name: string;
      /** Markup */
      markup: string;
      /**
       * Created When
       * Format: date-time
       */
      created_when: string;
      /**
       * Modified When
       * Format: date-time
       */
      modified_when: string;
    };
    /** TransformedCardResponse */
    TransformedCardResponse: {
      data: components["schemas"]["ExtendedCardDataResponse"];
      membership: components["schemas"]["ExtendedCardMembershipResponse"];
      /** Backlinks */
      backlinks: string[];
      /** Parents */
      parents: {
        "[card_id]"?: components["schemas"]["ExtendedCardParentResponse"];
      };
    };
    /** UpdatePrefs */
    UpdatePrefs: {
      sort_type?: components["schemas"]["SortType"];
      indent_type?: components["schemas"]["IndentType"];
      appearance_mode?: components["schemas"]["AppearanceMode"];
      day_theme?: components["schemas"]["AppearanceTheme"];
      night_theme?: components["schemas"]["AppearanceTheme"];
      /** Couple Key */
      couple_key?: string | null;
      persona?: components["schemas"]["UserPersona"] | null;
      haptic_threshold?: components["schemas"]["HapticThreshold"] | null;
    };
    /** UserAccount */
    UserAccount: {
      data: components["schemas"]["UserData"];
      /** Subscription */
      subscription:
        | components["schemas"]["StripeSubResponse"]
        | components["schemas"]["RevenuecatSubResponse"]
        | null;
      /** Quota */
      quota: number;
      /** Intercom Hash */
      intercom_hash?: string;
    };
    /** UserBioPhoto */
    UserBioPhoto: {
      public_profile: components["schemas"]["UserPublicProfile"];
    };
    /** UserData */
    UserData: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Email */
      email: string;
      /** First Name */
      first_name: string;
      /** Last Name */
      last_name: string;
      /** Username */
      username: string;
      /** Referral Code */
      referral_code: string;
      /** Bio */
      bio?: string | null;
      /** Photo */
      photo?: string | null;
      kind?: components["schemas"]["UserKind"] | null;
      prefs: components["schemas"]["UserPrefs"];
      /** Pref Flags */
      pref_flags: number;
      /** Feature Preview Flags */
      feature_preview_flags: number;
      /** Pins */
      pins: string[] | null;
      status: components["schemas"]["Status"];
      access_level: components["schemas"]["AccessLevel"];
    };
    /**
     * UserKind
     * @enum {integer}
     */
    UserKind: 0 | 1 | 2 | 3;
    /**
     * UserPersona
     * @enum {integer}
     */
    UserPersona: 0 | 1 | 2 | 3;
    /** UserPinsUpdateRequest */
    UserPinsUpdateRequest: {
      /** Pins */
      pins: string[];
      /**
       * Mode
       * @default replace
       * @enum {string}
       */
      mode?: "add" | "remove" | "replace";
    };
    /** UserPrefs */
    UserPrefs: {
      indent_type: components["schemas"]["IndentType"];
      sort_type: components["schemas"]["SortType"];
      appearance_mode: components["schemas"]["AppearanceMode"];
      day_theme: components["schemas"]["AppearanceTheme"];
      night_theme: components["schemas"]["AppearanceTheme"];
      /** Couple Key */
      couple_key: string | null;
      persona?: components["schemas"]["UserPersona"] | null;
      haptic_threshold?: components["schemas"]["HapticThreshold"] | null;
    };
    /** UserPublicProfile */
    UserPublicProfile: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** Username */
      username: string;
      /** First Name */
      first_name: string;
      /** Last Name */
      last_name: string;
      /** Bio */
      bio: string | null;
      /** Photo */
      photo: string | null;
    };
    /** UserPublicProfileUpdateRequest */
    UserPublicProfileUpdateRequest: {
      /** Bio */
      bio?: string | null;
      /** Photo */
      photo?: string | null;
    };
    /** UserTwoFaced */
    UserTwoFaced: {
      private_data: components["schemas"]["UserData"];
      public_profile: components["schemas"]["UserPublicProfile"];
    };
    /** UserUpdateRequest */
    UserUpdateRequest: {
      /** New Username */
      new_username: string;
      /** First Name */
      first_name: string;
      /** Last Name */
      last_name: string;
      /** Bio */
      bio?: string | null;
      /** Photo */
      photo?: string | null;
    };
    /** ValidationError */
    ValidationError: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "validation";
      /** Detail */
      detail: string;
      /** Meta */
      meta: {
        [key: string]: string;
      };
      /** Status */
      status: number;
    };
    /** VersionMeta */
    VersionMeta: {
      /** Name */
      name: string;
      /** Version */
      version: string;
      /** Hash */
      hash: string | null;
    };
    /**
     * ViewDisplayType
     * @enum {integer}
     */
    ViewDisplayType: 1 | 2 | 4;
    /**
     * Visibility
     * @enum {integer}
     */
    Visibility: -1 | 0 | 1;
    /** VisibilityFilter */
    VisibilityFilter: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "visibility";
      /**
       * Op
       * @constant
       * @enum {string}
       */
      op: "equals";
      arg: components["schemas"]["Visibility"];
      /** Name */
      name?: string | null;
      /** Inv */
      inv?: boolean | null;
      /** Case Sensitive */
      case_sensitive?: boolean | null;
    };
    /** WebhookResponse */
    WebhookResponse: {
      /** Id */
      id: number;
      /** Url */
      url: string;
      /** Enabled */
      enabled: boolean;
      /** Last Response Code */
      last_response_code?: number | null;
      /** Last Response Body */
      last_response_body?: unknown;
    };
    /** WrappedCardResponse */
    WrappedCardResponse: {
      /**
       * Success
       * @constant
       * @enum {boolean}
       */
      success: true;
      /**
       * Card Id
       * Format: uuid
       */
      card_id: string;
      /** Status Code */
      status_code: number;
      payload: components["schemas"]["TransformedCardResponse"];
    };
    /** WrappedErrorResponse */
    WrappedErrorResponse: {
      /**
       * Success
       * @constant
       * @enum {boolean}
       */
      success: false;
      /**
       * Card Id
       * Format: uuid
       */
      card_id: string;
      /** Status Code */
      status_code: number;
      /** Payload */
      payload: string;
    };
    /**
     * RewardType
     * @enum {string}
     */
    RewardType: "tag_cards" | "create_parents" | "link_cards" | "share_cards" | "confirm_email";
    /** PostCard */
    PostCard: {
      data: components["schemas"]["PostCardData"];
      membership: components["schemas"]["PostCardMembership"];
      /**
       * Parents
       * @default null
       */
      parents?: {
        "[card_id]"?: components["schemas"]["UpsertCardParent"];
      };
    };
    /** PostCardData */
    PostCardData: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /**
       * Name
       * @default
       */
      name?: string;
      /**
       * Markup
       * @default
       */
      markup?: string;
      /**
       * Html
       * @default
       */
      html?: string;
      /**
       * Ydoc
       * @default null
       */
      ydoc?: string | null;
      /**
       * Icon
       * @default null
       */
      icon?: string | null;
      /** @default null */
      color?: components["schemas"]["CoreColor"] | null;
      /**
       * Created When
       * @default null
       */
      created_when?: string | null;
      /**
       * Modified When
       * @default null
       */
      modified_when?: string | null;
      /**
       * Targeted When
       * @default null
       */
      targeted_when?: string | null;
      /**
       * Meta
       * @default null
       */
      meta?: {
        [key: string]: string | number | boolean;
      } | null;
      /**
       * Import Id
       * @default null
       */
      import_id?: string | null;
      /**
       * Tags
       * @default []
       */
      tags?: string[];
      /**
       * Source
       * @default null
       */
      source?: string | null;
    };
    /** PostCardMembership */
    PostCardMembership: {
      /**
       * Id
       * Format: uuid
       */
      id: string;
      /** @default null */
      personal_color?: components["schemas"]["CoreColor"] | null;
      /**
       * Personal Tags
       * @default []
       */
      personal_tags?: string[];
      /**
       * Created When
       * @default null
       */
      created_when?: string | null;
      /**
       * Liked
       * @default null
       */
      liked?: boolean | null;
      /**
       * Visibility
       * @default null
       */
      visibility?: number | null;
      /** @default null */
      view?: components["schemas"]["StoredViewData"] | null;
    };
    /** UpsertCardParent */
    UpsertCardParent: {
      /** @default null */
      publishing_perms?: components["schemas"]["Role"] | null;
      /**
       * Created When
       * @default null
       */
      created_when?: string | null;
      /**
       * Archived
       * @default null
       */
      archived?: boolean | null;
      /**
       * Cutting
       * @default null
       */
      cutting?: boolean | null;
    };
    /** PatchCard */
    PatchCard: {
      /** @default null */
      data?: components["schemas"]["PatchCardData"] | null;
      /** @default null */
      membership?: components["schemas"]["PatchCardMembership"] | null;
      /**
       * Parents
       * @default null
       */
      parents?: {
        "[card_id]"?: components["schemas"]["UpsertCardParent"];
      } | null;
    };
    /** PatchCardData */
    PatchCardData: {
      /**
       * Name
       * @default null
       */
      name?: string | null;
      /**
       * Markup
       * @default null
       */
      markup?: string | null;
      /**
       * Html
       * @default null
       */
      html?: string | null;
      /**
       * Ydoc
       * @default null
       */
      ydoc?: string | null;
      /**
       * Icon
       * @default null
       */
      icon?: string | null;
      /** @default null */
      color?: components["schemas"]["CoreColor"] | null;
      /**
       * Modified When
       * @default null
       */
      modified_when?: string | null;
      /**
       * Targeted When
       * @default null
       */
      targeted_when?: string | null;
      /**
       * Tags
       * @default null
       */
      tags?: string[] | null;
      /**
       * Meta
       * @default null
       */
      meta?: {
        [key: string]: string | number | boolean;
      } | null;
    };
    /** PatchCardMembership */
    PatchCardMembership: {
      /** @default null */
      personal_color?: components["schemas"]["CoreColor"] | null;
      /**
       * Liked
       * @default null
       */
      liked?: boolean | null;
      /**
       * Opened When
       * @default null
       */
      opened_when?: string | null;
      /**
       * Auto Publish Children
       * @default null
       */
      auto_publish_children?: boolean | null;
      /**
       * Personal Tags
       * @default null
       */
      personal_tags?: string[] | null;
      /** @default null */
      status?: components["schemas"]["Status"] | null;
      /** @default null */
      visibility?: components["schemas"]["Visibility"] | null;
      /** @default null */
      view?: components["schemas"]["StoredViewData"] | null;
    };
    /** AuthError */
    AuthError: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "auth";
      /** Detail */
      detail: string;
      /**
       * Meta
       * @enum {string}
       */
      meta: "APIKey" | "Bearer" | "Fresh" | "Refresh";
      /** Status */
      status: number;
    };
    /** BasicError */
    BasicError: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "basic";
      /** Detail */
      detail: string;
      /** Meta */
      meta: null;
      /** Status */
      status: number;
    };
    /** CardError */
    CardError: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "card";
      /** Detail */
      detail: string;
      /**
       * Meta
       * Format: uuid
       */
      meta: string;
      /** Status */
      status: number;
    };
    /** NumericError */
    NumericError: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "numeric";
      /** Detail */
      detail: string;
      /** Meta */
      meta: number;
      /** Status */
      status: number;
    };
    /** PermError */
    PermError: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "permission";
      /** Detail */
      detail: string;
      meta: components["schemas"]["PermErrorMeta"];
      /** Status */
      status: number;
    };
    /** PermErrorMeta */
    PermErrorMeta: {
      /** Perm Name */
      perm_name: string;
      /** Perm Value */
      perm_value: number;
    };
    /** RecaptchaError */
    RecaptchaError: {
      /**
       * Type
       * @constant
       * @enum {string}
       */
      type: "recaptcha";
      /** Detail */
      detail: string;
      /** Meta */
      meta: boolean;
      /** Status */
      status: number;
    };
    UnifiedError:
      | components["schemas"]["AuthError"]
      | components["schemas"]["BasicError"]
      | components["schemas"]["CardError"]
      | components["schemas"]["PermError"]
      | components["schemas"]["RecaptchaError"]
      | components["schemas"]["ValidationError"]
      | components["schemas"]["NumericError"];
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;

export type external = Record<string, never>;

export interface operations {
  /** Root */
  root__get: {
    responses: {
      /** @description Successful Response */
      307: {
        content: never;
      };
    };
  };
  /** Version Meta */
  _version_meta_v1_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["VersionMeta"];
        };
      };
    };
  };
  /**
   * Get Card
   * @description Get a specified card
   */
  _get_card_v1_cards__card_id__get: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["TransformedCardResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Selected Cards
   * @description The "base query" for retrieving cards (memberships) – supports selecting, filtering, and
   * ordering by any implemented metric
   *
   * NOTE: This is a "POST-GET" endpoint – the method is POST (for the payload) but it GETs data
   */
  _get_selected_cards_v1_cards_get_select_post: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["ExtendedSelectCriteria"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": {
            "[card_id]"?: components["schemas"]["TransformedCardResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Specified Cards
   * @description Get the full card memberships of all the card IDs passed in the request body
   *
   * NOTE: This is a "POST-GET" endpoint – the method is POST (for the payload) but it GETs data
   */
  _get_specified_cards_v1_cards_get_specify_post: {
    requestBody: {
      content: {
        "application/json": string[];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": {
            "[card_id]"?: components["schemas"]["TransformedCardResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Deleted Cards
   * @description Get a list of recently deleted card IDs for this user
   */
  _get_deleted_cards_v1_cards_get_deleted_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": string[];
        };
      };
    };
  };
  /**
   * Simple Create Card
   * @description Create a single card with the minimum amount of data required
   */
  _simple_create_card_v1_cards_simple_post: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["PostSimpleCard"];
      };
    };
    responses: {
      /** @description Successful Response */
      207: {
        content: {
          "application/json": {
            [key: string]:
              | components["schemas"]["WrappedCardResponse"]
              | components["schemas"]["WrappedErrorResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Simple Append
   * @description Append content to an existing card
   */
  _simple_append_v1_cards_simple__card_id__append_put: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": string;
      };
    };
    responses: {
      /** @description Successful Response */
      207: {
        content: {
          "application/json": {
            [key: string]:
              | components["schemas"]["WrappedCardResponse"]
              | components["schemas"]["WrappedErrorResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Daily Append */
  _daily_append_v1_cards_daily_put: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["DailyAppend"];
      };
    };
    responses: {
      /** @description Successful Response */
      207: {
        content: {
          "application/json": {
            [key: string]:
              | components["schemas"]["WrappedCardResponse"]
              | components["schemas"]["WrappedErrorResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Create Cards
   * @description Create cards with full control over properties
   */
  _create_cards_v1_cards_post: {
    requestBody: {
      content: {
        "application/json": {
          "[card_id]"?: components["schemas"]["PostCard"];
        };
      };
    };
    responses: {
      /** @description Successful Response */
      207: {
        content: {
          "application/json": {
            [key: string]:
              | components["schemas"]["WrappedCardResponse"]
              | components["schemas"]["WrappedErrorResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Update Cards
   * @description Update many cards in one call
   */
  _update_cards_v1_cards_patch: {
    parameters: {
      header?: {
        "snowshoe-session-id"?: string | null;
      };
    };
    requestBody: {
      content: {
        "application/json": {
          "[card_id]"?: components["schemas"]["PatchCard"];
        };
      };
    };
    responses: {
      /** @description Successful Response */
      207: {
        content: {
          "application/json": {
            [key: string]:
              | components["schemas"]["WrappedCardResponse"]
              | components["schemas"]["WrappedErrorResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Enroll In Card
   * @description Enroll in a card – the current user will be given access to all child cards(that have been
   * published) within the specified card. If the user has already enrolled, this endpoint will
   * return all child cards to provide idempotency.
   */
  _enroll_in_card_v1_cards_enroll__card_id__put: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": {
            "[card_id]"?: components["schemas"]["TransformedCardResponse"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Remove Cards For Me
   * @description Completely remove access to cards for the current user
   */
  _remove_cards_for_me_v1_cards_remove_post: {
    requestBody: {
      content: {
        "application/json": string[];
      };
    };
    responses: {
      /** @description Successful Response */
      207: {
        content: {
          "application/json": {
            [key: string]: 200 | 403 | 404;
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Delete Cards For Everyone
   * @description Completely (and irreversibly) delete cards from the Supernotes platform
   */
  _delete_cards_for_everyone_v1_cards_delete_post: {
    requestBody: {
      content: {
        "application/json": string[];
      };
    };
    responses: {
      /** @description Successful Response */
      207: {
        content: {
          "application/json": {
            [key: string]: 200 | 403 | 404;
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Collections
   * @description Get all collections owned by the user
   */
  _get_collections_v1_collections_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CollectionResponse"][];
        };
      };
    };
  };
  /**
   * Get Deleted Collections
   * @description Get the IDs of collections deleted by the user
   */
  _get_deleted_collections_v1_collections_deleted_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": string[];
        };
      };
    };
  };
  /**
   * Get Collection
   * @description Get the specified collection
   */
  _get_collection_v1_collections__collection_id__get: {
    parameters: {
      path: {
        collection_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CollectionResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Create Collection
   * @description Create a custom collection
   */
  _create_collection_v1_collections__collection_id__post: {
    parameters: {
      path: {
        collection_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PostCollection"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CollectionResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Delete Collection
   * @description Delete the specified collection
   */
  _delete_collection_v1_collections__collection_id__delete: {
    parameters: {
      path: {
        collection_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["SuccessMessage"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Update Collection
   * @description Update the specified collection
   */
  _update_collection_v1_collections__collection_id__patch: {
    parameters: {
      path: {
        collection_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PatchCollection"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CollectionResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Comments
   * @description Get all comments for the specified card
   */
  _get_comments_v1_comments__card_id__get: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CommentResponse"][];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Edit Comment
   * @description Update the specified comment on the specified card
   */
  _edit_comment_v1_comments__card_id___comment_id__put: {
    parameters: {
      path: {
        card_id: string;
        comment_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PutComment"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CommentResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Create Comment
   * @description Create a new comment on the specified card
   */
  _create_comment_v1_comments__card_id___comment_id__post: {
    parameters: {
      path: {
        card_id: string;
        comment_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PostComment"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CommentResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Delete Comment
   * @description Delete the specified comment from the specified card
   */
  _delete_comment_v1_comments__card_id___comment_id__delete: {
    parameters: {
      path: {
        card_id: string;
        comment_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Get Friends */
  _get_friends_v1_friends_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["FriendshipResponse"][];
        };
      };
    };
  };
  /** Send Friend Request */
  _send_friend_request_v1_friends_post: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["Body__send_friend_request_v1_friends_post"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["FriendshipResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Get Incoming Requests */
  _get_incoming_requests_v1_friends_incoming_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["FriendshipResponse"][];
        };
      };
    };
  };
  /** Get Outgoing Requests */
  _get_outgoing_requests_v1_friends_outgoing_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["FriendshipResponse"][];
        };
      };
    };
  };
  /** Accept Friendship */
  _accept_friendship_v1_friends__other_user_id__put: {
    parameters: {
      path: {
        other_user_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["FriendshipResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Delete Friendship */
  _delete_friendship_v1_friends__other_user_id__delete: {
    parameters: {
      path: {
        other_user_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": string;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get User Api Keys
   * @description Get all API keys for the user
   */
  _get_user_api_keys_v1_keys_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ApiKeyResponse"][];
        };
      };
    };
  };
  /**
   * Modify Api Key
   * @description Modify an API key for the user
   */
  _modify_api_key_v1_keys_put: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["PutApiKey"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ApiKeyResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Create Api Key
   * @description Create a new API key for the user
   */
  _create_api_key_v1_keys_post: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ApiKeyResponse"];
        };
      };
    };
  };
  /**
   * Delete Api Key
   * @description Delete an API key for the user
   */
  _delete_api_key_v1_keys_delete_post: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["Body__delete_api_key_v1_keys_delete_post"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get User Sending Email
   * @description Get the user's email-sending key
   */
  _get_user_sending_email_v1_keys_email_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ApiKeyResponse"];
        };
      };
    };
  };
  /**
   * Create User Sending Email
   * @description Create a new email-sending key for a user
   */
  _create_user_sending_email_v1_keys_email_post: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ApiKeyResponse"];
        };
      };
    };
  };
  /**
   * Delete User Sending Email
   * @description Delete a user's email-sending key
   */
  _delete_user_sending_email_v1_keys_email_delete: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
    };
  };
  /**
   * Get Members
   * @description Get data about members of this card (permissions, statuses, etc)
   */
  _get_members_v1_members__card_id__get: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": {
            "[card_id]"?: components["schemas"]["Member"];
          };
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Attempt Join
   * @description Attempt to join a card (based on having access to some arbitrary ancestor card)
   */
  _attempt_join_v1_members__card_id__attempt_join_post: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["TransformedCardResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Invite Member
   * @description Invite a friend directly to an existing card
   */
  _invite_member_v1_members__card_id__invite__user_id__post: {
    parameters: {
      path: {
        card_id: string;
        user_id: string;
      };
    };
    requestBody?: {
      content: {
        "application/json": components["schemas"]["Body__invite_member_v1_members__card_id__invite__user_id__post"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["Member"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Respond To Invite
   * @description Respond to a card invitation
   */
  _respond_to_invite_v1_members__card_id__invite__invite_response__put: {
    parameters: {
      path: {
        invite_response: "accept" | "reject";
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Modify Member
   * @description Update another user's card membership
   */
  _modify_member_v1_members__card_id___target_user_id__put: {
    parameters: {
      path: {
        card_id: string;
        target_user_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["Body__modify_member_v1_members__card_id___target_user_id__put"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": number;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Delete Member
   * @description Delete the member from the specified card
   */
  _delete_member_v1_members__card_id___target_user_id__delete: {
    parameters: {
      path: {
        card_id: string;
        target_user_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Current User Profile
   * @description Get the authenticated user's public profile
   */
  _get_current_user_profile_v1_profiles_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserPublicProfile"];
        };
      };
    };
  };
  /**
   * Get Known Owner Profiles
   * @description Get the public profiles for all card owners the current user knows
   */
  _get_known_owner_profiles_v1_profiles_known_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserPublicProfile"][];
        };
      };
    };
  };
  /**
   * Get Other User Profile
   * @description Get the specified user's public profile
   */
  _get_other_user_profile_v1_profiles__user_id__get: {
    parameters: {
      path: {
        user_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserPublicProfile"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Specified User Profiles
   * @description Get the public profiles for a specified list of users
   */
  _get_specified_user_profiles_v1_profiles_specify_post: {
    requestBody: {
      content: {
        "application/json": string[];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserPublicProfile"][];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Synth Credits
   * @description Get the number of synthetic credits the user has
   */
  _get_synth_credits_v1_synth_credits_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["SynthCreditsResponse"];
        };
      };
    };
  };
  /** Get Share Codes For Card */
  _get_share_codes_for_card_v1_sharing__card_id__get: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ShareCodeResponse"][];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Create Share Code
   * @description Create a new share code (if user has permission)
   */
  _create_share_code_v1_sharing__card_id__post: {
    parameters: {
      path: {
        card_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ShareCodeRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ShareCodeResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Update Share Code
   * @description Modify an existing share code (if user has permission)
   */
  _update_share_code_v1_sharing__card_id___share_code_id__put: {
    parameters: {
      path: {
        share_code_id: string;
        card_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ShareCodeRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["ShareCodeResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Delete Share Code
   * @description Delete an existing share code (if user has permission)
   */
  _delete_share_code_v1_sharing__card_id___share_code_id__delete: {
    parameters: {
      path: {
        share_code_id: string;
        card_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Find Card With Share Code
   * @description Retrieve card data (and share code metadata) by specifying a share code.
   */
  _find_card_with_share_code_v1_sharing_code__code__get: {
    parameters: {
      path: {
        code: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CompleteShareResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Authed Find Card With Share Code
   * @description Retrieve card data (and share code metadata) by specifying a share code.
   * Check for auth headers and if the user already has access to this card, return a 409 error.
   */
  _authed_find_card_with_share_code_v1_sharing_code__code__authed_get: {
    parameters: {
      path: {
        code: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["CompleteShareResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Join Card With Share Code
   * @description Join a card via share code (if allowed)
   */
  _join_card_with_share_code_v1_sharing_code__code__join_post: {
    parameters: {
      path: {
        code: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["TransformedCardResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Users Tags
   * @description Get all tags known to the user
   */
  _get_users_tags_v1_tags_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": string[];
        };
      };
    };
  };
  /**
   * Get All Templates
   * @description Get all templates for this user
   */
  _get_all_templates_v1_templates_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["TemplateResponse"][];
        };
      };
    };
  };
  /**
   * Edit Template
   * @description Update the specified template
   */
  _edit_template_v1_templates__template_id__put: {
    parameters: {
      path: {
        template_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PutTemplate"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["TemplateResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Create Template
   * @description Create a new template
   */
  _create_template_v1_templates__template_id__post: {
    parameters: {
      path: {
        template_id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PostTemplate"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["TemplateResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Delete Template
   * @description Delete the specified template
   */
  _delete_template_v1_templates__template_id__delete: {
    parameters: {
      path: {
        template_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Set Preferences
   * @description Sets multiple preferences for the user
   */
  _set_preferences_v1_user_prefs_patch: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdatePrefs"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserPrefs"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Set Preference Flag
   * @description Sets a boolean preference flag for the user
   */
  _set_preference_flag_v1_user_prefs_flag__pref_flag__put: {
    parameters: {
      path: {
        pref_flag: components["schemas"]["PrefFlag"];
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["Body__set_preference_flag_v1_user_prefs_flag__pref_flag__put"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Set Feature Preview Flag
   * @description Sets a boolean feature preview flag for the user
   */
  _set_feature_preview_flag_v1_user_prefs_feature_preview__feature_flag__put: {
    parameters: {
      path: {
        feature_flag: components["schemas"]["FeaturePreviewFlag"];
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["Body__set_feature_preview_flag_v1_user_prefs_feature_preview__feature_flag__put"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get User Email Addresses
   * @description Get all emails for a user
   */
  _get_user_email_addresses_v1_user_emails_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["EmailAddressResponse"][];
        };
      };
    };
  };
  /** Get Email */
  _get_email_v1_user_emails__email_id__get: {
    parameters: {
      path: {
        email_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["EmailAddressResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Delete Email */
  _delete_email_v1_user_emails__email_id__delete: {
    parameters: {
      path: {
        email_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["SuccessMessage"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Make Email Primary */
  _make_email_primary_v1_user_emails__email_id__primary_put: {
    parameters: {
      path: {
        email_id: string;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["SuccessMessage"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Check Auth
   * @description Check if using a valid authentication token and return the associated User ID
   */
  _check_auth_v1_user_token_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["AuthCheckResponse"];
        };
      };
    };
  };
  /**
   * Check If Fresh Access Token
   * @description Check if the access token is 'fresh' and return the associated User ID
   */
  _check_if_fresh_access_token_v1_user_token_fresh_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
    };
  };
  /**
   * Get Current User
   * @description Get the authenticated user's information, including subscription details
   */
  _get_current_user_v1_user_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserAccount"];
        };
      };
    };
  };
  /**
   * Update Current User
   * @description Update the authenticated user's personal information
   */
  _update_current_user_v1_user_put: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["UserUpdateRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserTwoFaced"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Update Current User Bio And Pic
   * @description Update a public user's profile bio and image
   */
  _update_current_user_bio_and_pic_v1_user_bio_and_pic_put: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["UserPublicProfileUpdateRequest"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["UserBioPhoto"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /**
   * Get Pins
   * @description Get the authenticated user's pins
   */
  _get_pins_v1_user_pins_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": {
            "[card_id]"?: components["schemas"]["TransformedCardResponse"];
          };
        };
      };
    };
  };
  /**
   * Update Pins
   * @description Modify which cards the user has 'pinned'
   */
  _update_pins_v1_user_pins_put: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["UserPinsUpdateRequest"] | string[];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": string[];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Get User Webhooks */
  _get_user_webhooks_v1_webhooks_get: {
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["WebhookResponse"][];
        };
      };
    };
  };
  /** Create Webhook */
  _create_webhook_v1_webhooks_post: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["PostWebhook"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["WebhookResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Modify Webhook */
  _modify_webhook_v1_webhooks__webhook_id__put: {
    parameters: {
      path: {
        webhook_id: number;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["PutWebhook"];
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": components["schemas"]["WebhookResponse"];
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
  /** Delete Webhook */
  _delete_webhook_v1_webhooks__webhook_id__delete: {
    parameters: {
      path: {
        webhook_id: number;
      };
    };
    responses: {
      /** @description Successful Response */
      200: {
        content: {
          "application/json": unknown;
        };
      };
      /** @description Unified Error */
      "4XX": {
        content: {
          "application/json": components["schemas"]["UnifiedError"];
        };
      };
    };
  };
}
