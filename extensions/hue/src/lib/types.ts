/*
 * The information in this file is based on the Hue API reference.
 *
 * https://developers.meethue.com/develop/hue-api-v2/api-reference/
 *
 * Not all information is included in this file. Only the information that is used by this project.
 */

///////////////////////
// Non-Hue API types //
///////////////////////

export type Id = string | number;
export type Palette = string[];
export type LightIcon = { iconPath: string; color: string };
export type PngUri = string;
export type PngUriCache = Map<Id, PngUri>;
export type PngUriLightIconSet = { on: PngUri; offLight: PngUri; offDark: PngUri };

export type BridgeConfig = {
  ipAddress: string;
  id: string;
  username: string;
};

export type ParsedUpdateEvent = { key: number; value: UpdateEvent };

export type CssColor = {
  name: string;
  value: string;
};

/**
 * RGB values are in the range 0-255.
 */
export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export interface HasId {
  id: Id;
}

export type Method = "GET" | "DELETE" | "HEAD" | "OPTIONS" | "POST" | "PUT" | "PATCH" | "PURGE" | "LINK" | "UNLINK";

export type MDnsService = {
  addresses: string[];
  subtypes: string[];
  rawTxt: Buffer[];
  txt: Record<string, string>;
  name: string;
  fqdn: string;
  host: string;
  referer: {
    address: string;
    family: string;
    port: number;
    size: number;
  };
  port: number;
  type: string;
  protocol: string;
};

export type HueApiService = {
  id: string;
  internalipaddress: string;
  port: number;
};

///////////////////
// Hue API types //
///////////////////

export type LinkResponse = {
  success?: {
    username: string;
    clientkey: string;
  };
  error?: {
    type: number;
    address: string;
    description: string;
  };
};

type LightArchetype =
  | "unknown_archetype"
  | "classic_bulb"
  | "sultan_bulb"
  | "flood_bulb"
  | "spot_bulb"
  | "candle_bulb"
  | "luster_bulb"
  | "pendant_round"
  | "pendant_long"
  | "ceiling_round"
  | "ceiling_square"
  | "floor_shade"
  | "floor_lantern"
  | "table_shade"
  | "recessed_ceiling"
  | "recessed_floor"
  | "single_spot"
  | "double_spot"
  | "table_wash"
  | "wall_lantern"
  | "wall_shade"
  | "flexible_lamp"
  | "ground_spot"
  | "wall_spot"
  | "plug"
  | "hue_go"
  | "hue_lightstrip"
  | "hue_iris"
  | "hue_bloom"
  | "bollard"
  | "wall_washer"
  | "hue_play"
  | "vintage_bulb"
  | "vintage_candle_bulb"
  | "ellipse_bulb"
  | "triangle_bulb"
  | "small_globe_bulb"
  | "large_globe_bulb"
  | "edison_bulb"
  | "christmas_tree"
  | "string_light"
  | "hue_centris"
  | "hue_lightstrip_tv"
  | "hue_lightstrip_pc"
  | "hue_tube"
  | "hue_signe"
  | "pendant_spot"
  | "ceiling_horizontal"
  | "ceiling_tube";

export type ResourceIdentifier = {
  /**
   * string (pattern: ^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$)
   *
   * The unique ide of the referenced resource
   */
  rid: string;

  /**
   * The type of the referenced resource
   */
  rtype:
    | "device"
    | "bridge_home"
    | "room"
    | "zone"
    | "light"
    | "button"
    | "relative_rotary"
    | "temperature"
    | "light_level"
    | "motion"
    | "entertainment"
    | "grouped_light"
    | "device_power"
    | "zigbee_bridge_connectivity"
    | "zigbee_connectivity"
    | "zgp_connectivity"
    | "bridge"
    | "zigbee_device_discovery"
    | "homekit"
    | "matter"
    | "matter_fabric"
    | "scene"
    | "entertainment_configuration"
    | "public_image"
    | "auth_v1"
    | "behavior_script"
    | "behavior_instance"
    | "geofence"
    | "geofence_client"
    | "geolocation"
    | "smart_scene";
};

export type Xy = {
  /**
   * number (0 - 1)
   *
   * X position in the color gamut
   */
  x: number;

  /**
   * number (0 - 1)
   *
   * Y position in the color gamut
   */
  y: number;
};

/**
 * Not all properties are included in this type definition.
 */
export type Light = {
  /**
   * Type of the supported resources
   */
  type?: "light";

  /**
   * string (pattern: ^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$)
   *
   * Unique identifier representing a specific resource instance.
   */
  id: string;

  /**
   * Clip v1 resource identifier.
   */
  id_v1?: string;

  /**
   * Owner of the service
   *
   * If the owner service is deleted, the service also gets deleted.
   */
  owner: ResourceIdentifier;

  /**
   * Deprecated: use metadata on device level
   */
  metadata: {
    /**
     * Human-readable name of the resource
     */
    name: string;

    /**
     * Light archetype
     */
    archetype: LightArchetype;

    /**
     * The fixed mired value of the white lamp
     */
    fixed_mired?: number;
  };

  on: {
    /**
     * On/Off state of the light
     */
    on: boolean;
  };

  dimming?: {
    /**
     * number (maximum: 100)
     *
     * Brightness percentage
     *
     * Value cannot be 0. Writing 0 changes it to the lowest possible brightness.
     */
    brightness: number;

    /**
     * integer (0 - 100)
     *
     * Percentage of the maximum lumen the device outputs on minimum brightness.
     */
    min_dim_level?: number;
  };

  color_temperature: {
    /**
     * integer (153 - 500)
     *
     * Color temperature in mired, or null when the light color is not on the ct spectrum.
     */
    mirek: number;

    /**
     * Indication whether the value presented in mired is valid
     */
    mirek_valid: boolean;

    mirek_schema: {
      /**
       * integer (153 – 500)
       *
       * Minimum color temperature this light supports
       */
      mirek_minimum: number;

      /**
       * integer (153 – 500)
       *
       * Maximum color temperature this light supports
       */
      mirek_maximum: number;
    };
  };

  color?: {
    /**
     * CIE XY gamut position
     */
    xy?: Xy;

    /**
     * Color gamut of color bulb.
     * Some bulbs do not properly return the Gamut information.
     * In this case, this is not present.
     */
    gamut?: {
      /**
       * CIE XY gamut position
       */
      red: {
        /**
         * number (0 – 1)
         *
         * X position in the color gamut
         */
        x: number;

        /**
         * number (0 – 1)
         *
         * Y position in the color gamut
         */
        y: number;
      };

      /**
       * CIE XY gamut position
       */
      green: {
        /**
         * number (0 – 1)
         *
         * X position in the color gamut
         */
        x: number;

        /**
         * number (0 – 1)
         *
         * Y position in the color gamut
         */
        y: number;
      };

      /**
       * CIE XY gamut position
       */
      blue: {
        /**
         * number (0 – 1)
         *
         * X position in the color gamut
         */
        x: number;

        /**
         * number (0 – 1)
         *
         * Y position in the color gamut
         */
        y: number;
      };
    };

    /**
     * The gamut types supported by hue
     *
     * Can only be read, not written. Hence, it is not required.
     *
     * - A:     Gamut of early Philips color-only products
     * - B:     Limited gamut of first Hue color products
     * - C:     Richer color gamut of Hue white and color ambiance products
     * - other: Color gamut of non-hue products with non-hue gamuts resp w/o gamut
     */
    gamut_type?: "A" | "B" | "C" | "other";
  };

  dynamics: {
    /**
     * integer
     *
     * Duration of a light transition or timed effects in ms.
     */
    duration: number;
  };
};

export type LightRequest = {
  /**
   * Type of the supported resources
   */
  type?: "light";

  metadata?: {
    /**
     * minLength: 1, maxLength: 32
     *
     * Human-readable name of the resource
     */
    name: string;

    /**
     * Light archetype
     */
    archetype: LightArchetype;
  };

  on?: {
    /**
     * On/Off state of the light
     */
    on?: boolean;
  };

  dimming?: {
    /**
     * number (maximum: 100)
     *
     * Brightness percentage
     *
     * Value cannot be 0. Writing 0 changes it to the lowest possible brightness.
     */
    brightness?: number;
  };

  dimming_delta?: {
    action: "up" | "down" | "stop";

    /**
     * number (maximum: 100)
     *
     * Brightness percentage of full-scale increases delta to current dimming level.
     *
     * Clip at Max-level or Min-level.
     */
    brightness_delta?: number;
  };

  color_temperature?: {
    /**
     * integer (153 - 500)
     *
     * Color temperature in mired, or null when the light color is not on the ct spectrum.
     */
    mirek?: number;
  };

  color_temperature_delta?: {
    action: "up" | "down" | "stop";

    /**
     * integer (maximum: 347)
     *
     * The mired delta to current mired. Clip at mired_minimum and mired_maximum of mired_schema.
     */
    mirek_delta?: number;
  };

  color?: {
    /**
     * CIE XY gamut position
     */
    xy?: Xy;
  };

  dynamics?: {
    /**
     * integer
     *
     * Duration of a light transition or timed effects in ms.
     */
    duration?: number;
  };
};

export type GroupedLight = {
  /**
   * Type of the supported resources
   */
  type?: "grouped_light";

  /**
   * string (pattern: ^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$)
   *
   * Unique identifier representing a specific resource instance.
   */
  id: string;

  /**
   * Clip v1 resource identifier.
   */
  id_v1?: string;

  /**
   * Owner of the service
   *
   * If the owner service is deleted, the service also gets deleted.
   */
  owner: ResourceIdentifier;

  /**
   * Joined on control & aggregated on state.
   *
   * “on” is true if any light in the group is on.
   */
  on?: {
    /**
     * On/Off state of the light group
     */
    on: boolean;
  };

  /**
   * Joined dimming control
   *
   * “dimming.brightness” contains average brightness of the group containing
   * turned-on lights only.
   */
  dimming?: {
    /**
     * Brightness percentage
     *
     * Value cannot be 0, writing 0 changes it to the lowest possible brightness
     */
    brightness: number;
  };
};

export type Scene = {
  /**
   * Type of the supported resources
   */
  type?: "scene";

  /**
   * Unique identifier representing a specific resource instance
   */
  id: string;

  /**
   * Clip v1 resource identifier
   */
  id_v1?: string;

  /**
   * List of actions to be executed synchronously on recall
   */
  actions: {
    /**
     * The identifier of the light to execute the action on
     */
    target: ResourceIdentifier;

    /**
     * The action to be executed on recall
     */
    action: {
      on?: {
        /**
         * On/Off state of the light
         */
        on: boolean;
      };

      dimming?: {
        /**
         * Brightness percentage, value cannot be 0.
         *
         * Writing 0 changes it to the lowest possible brightness.
         */
        brightness: number;
      };

      color?: {
        /**
         * CIE XY gamut position
         */
        xy: {
          /**
           * number (0 – 1)
           *
           * X position in the color gamut
           */
          x: number;

          /**
           * number (0 – 1)
           *
           * Y position in the color gamut
           */
          y: number;
        };
      };

      color_temperature?: {
        /**
         * integer (153 - 500)
         *
         * Color temperature in mired, or null when the light color is not on the ct spectrum.
         */
        mirek: number;
      };
    };
  }[];

  metadata: {
    /**
     * Human-readable name of the resource
     */
    name: string;

    /**
     * Reference with a unique identifier for the image representing the scene
     *
     * Only accepting “rtype”: “public_image” on creation
     */
    image?: ResourceIdentifier;
  };

  /**
   * Group associated with this Scene
   *
   * All services in the group are part of this scene.
   * If the group is changed (e.g., light added/removed), the scene is updated.
   */
  group: ResourceIdentifier;

  /**
   * Group of colors that describe the palette of colors to be used when playing dynamics
   */
  palette?: {
    /**
     * minItems: 0 - maxItems: 9
     */
    color: {
      color: {
        /**
         * CIE XY gamut position
         */
        xy: Xy;

        dimming: {
          /**
           * Brightness percentage. value cannot be 0, writing 0 changes it to the lowest possible brightness
           */
          brightness: number;
        };
      };
    }[];

    /**
     * minItems: 0 - maxItems: 1
     */
    color_temperature: {
      color_temperature: {
        /**
         * integer (153 - 500)
         */
        mirek: number;
      };

      dimming: {
        /**
         * Brightness percentage. value cannot be 0, writing 0 changes it to the lowest possible brightness
         */
        brightness: number;
      };
    }[];

    /**
     * minItems: 0 - maxItems: 1
     */
    dimming: {
      /**
       * Brightness percentage. value cannot be 0, writing 0 changes it to the lowest possible brightness
       */
      brightness: number;
    }[];
  };

  /**
   * Undocumented, but present in the API
   */
  status: {
    active: "static" | "dynamic" | "inactive";
  };
};

export type SceneRequest = {
  /**
   * Type of the supported resources
   */
  type?: "scene";

  recall?: {
    /**
     * When writing active, the actions in the scene are executed on the target.
     *
     * dynamic_palette starts a dynamic scene with colors in the Palette object.
     */
    action?: "active" | "dynamic_palette" | "static";

    /**
     * When writing active, the actions in the scene are executed on the target.
     *
     * dynamic_palette starts a dynamic scene with colors in the Palette object.
     */
    status?: "active" | "dynamic_palette";

    /**
     * Transition to the scene within the timeframe given by duration
     */
    duration?: number;

    /**
     * Override the scene dimming/brightness
     */
    dimming?: {
      /**
       * integer (0 – 100)
       *
       * Brightness percentage. value cannot be 0, writing 0 changes it to the lowest possible brightness
       */
      brightness?: number;
    };
  };
};

export type Group = {
  /**
   * Type of the supported resources
   */
  type?: "room" | "zone";

  /**
   * Unique identifier representing a specific resource instance
   */
  id: string;

  /**
   * Clip v1 resource identifier
   */
  id_v1?: string;

  /**
   * Child devices/services to the group by the derived group
   */
  children: ResourceIdentifier[];

  /**
   * References all services aggregating control and state of children in the
   * group.
   *
   * - This includes all services grouped in the group hierarchy given by
   *   child relation.
   * - This includes all services of a device grouped in the group hierarchy
   *   given by child relation
   *
   * Aggregation is per service type, i.e., every service type, which can be
   * grouped has a corresponding definition of the grouped type.
   *
   * Supported types:
   *
   * - grouped_light
   */
  services: ResourceIdentifier[];

  /**
   * Configuration object for a room
   */
  metadata: {
    /**
     * Human-readable name of the resource
     */
    name: string;

    /**
     * Possible archetypes of a room
     */
    archetype:
      | "living_room"
      | "kitchen"
      | "dining"
      | "bedroom"
      | "kids_bedroom"
      | "bathroom"
      | "nursery"
      | "recreation"
      | "office"
      | "gym"
      | "hallway"
      | "toilet"
      | "front_door"
      | "garage"
      | "terrace"
      | "garden"
      | "driveway"
      | "carport"
      | "home"
      | "downstairs"
      | "upstairs"
      | "top_floor"
      | "attic"
      | "guest_room"
      | "staircase"
      | "lounge"
      | "man_cave"
      | "computer"
      | "studio"
      | "music"
      | "tv"
      | "reading"
      | "closet"
      | "storage"
      | "laundry_room"
      | "balcony"
      | "porch"
      | "barbecue"
      | "pool"
      | "other";
  };
};

export type Room = { type?: "room" } & Group;
export type Zone = { type?: "zone" } & Group;

export type UpdateEvent = {
  /**
   * The creation time of the update event, represented as an ISO 8601 string.
   */
  creationtime: string;

  /**
   * The data of the update event, represented as an array of API objects.
   */
  data: Partial<Light | GroupedLight | Room | Zone | Scene>[];

  /**
   * A unique identifier for the update event, represented as a UUID string.
   */
  id: string;

  /**
   * The type of the event, in this case, it is 'update'.
   */
  type: "update";
};
