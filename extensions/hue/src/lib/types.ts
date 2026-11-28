/*
 * The Hue CLIP API v2 resources this extension uses: lights, grouped lights, scenes, rooms and zones, their request
 * bodies, responses and events. Checked against the official API reference and real bridge responses.
 *
 * https://developers.meethue.com/develop/hue-api-v2/api-reference/
 */

///////////////////////
// Non-Hue API types //
///////////////////////

export type Id = string | number;
export type Palette = string[];

export type BridgeConfig = {
  ipAddress: string;
  id: string;
  username: string;
};

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

export type HueApiService = {
  id: string;
  internalipaddress: string;
  port: number;
};

/**
 * Makes every property optional, at every depth. Arrays stay whole, as events send them whole.
 */
export type DeepPartial<T> = T extends unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

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

/**
 * The reference leaves out private_group, which bridges send as the owner of some grouped lights.
 */
export type ResourceType =
  | "device"
  | "bridge_home"
  | "room"
  | "zone"
  | "service_group"
  | "private_group"
  | "light"
  | "button"
  | "bell_button"
  | "relative_rotary"
  | "temperature"
  | "light_level"
  | "motion"
  | "camera_motion"
  | "entertainment"
  | "contact"
  | "tamper"
  | "convenience_area_motion"
  | "security_area_motion"
  | "speaker"
  | "switch_input_configuration"
  | "power_output_configuration"
  | "grouped_light"
  | "grouped_motion"
  | "grouped_light_level"
  | "device_power"
  | "device_software_update"
  | "zigbee_connectivity"
  | "zgp_connectivity"
  | "bridge"
  | "motion_area_candidate"
  | "wifi_connectivity"
  | "zigbee_device_discovery"
  | "homekit"
  | "matter"
  | "matter_fabric"
  | "scene"
  | "entertainment_configuration"
  | "public_image"
  | "auth_v1"
  | "behavior_script"
  | "behavior_script_formula"
  | "behavior_instance"
  | "geofence_client"
  | "geolocation"
  | "smart_scene"
  | "motion_area_configuration"
  | "clip";

export type ResourceIdentifier = {
  /**
   * The unique id of the referenced resource
   */
  rid: string;

  rtype: ResourceType;
};

export type HueError = {
  /**
   * A human-readable explanation specific to this occurrence of the problem
   */
  description: string;

  error_code: "communication_error" | "attribute_may_have_no_effect" | "client_error" | "internal_error";
};

/**
 * The body of every response. A GET returns the resources, a PUT the identifiers of the resources it changed.
 */
export type HueResponse<T> = {
  errors: HueError[];
  data: T[];
};

/**
 * An object the bridge sends without properties, to show that a resource supports a feature only requests use.
 */
type Empty = Record<string, never>;

export type Xy = {
  /**
   * number (0 - 1)
   *
   * X position in the CIE color gamut
   */
  x: number;

  /**
   * number (0 - 1)
   *
   * Y position in the CIE color gamut
   */
  y: number;
};

type On = {
  /**
   * On/Off state of the light
   */
  on: boolean;
};

type Dimming = {
  /**
   * number (0 - 100)
   *
   * Brightness percentage. 0 is the lowest possible brightness, not off.
   */
  brightness: number;
};

type Color = {
  /**
   * CIE XY gamut position
   */
  xy: Xy;
};

type Position = {
  x: number;
  y: number;
  z: number;
};

export type LightArchetype =
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
  | "ceiling_tube"
  | "up_and_down"
  | "up_and_down_up"
  | "up_and_down_down"
  | "hue_floodlight_camera"
  | "twilight"
  | "twilight_front"
  | "twilight_back"
  | "hue_play_wallwasher"
  | "hue_omniglow"
  | "hue_neon"
  | "string_globe"
  | "string_permanent"
  | "hue_go_xxl"
  | "rigid_tube"
  | "flexible_tube"
  | "panels"
  | "pendant_tube"
  | "vertical_tube"
  | "recessed_ceiling_tube"
  | "wall_rectangle"
  | "string_icicle"
  | "string_grid"
  | "string_net"
  | "hue_omniglow_arc"
  | "hue_flux_arc";

type LightFunction = "functional" | "decorative" | "mixed" | "unknown";

type Effect =
  | "prism"
  | "opal"
  | "glisten"
  | "sparkle"
  | "fire"
  | "candle"
  | "underwater"
  | "cosmos"
  | "sunbeam"
  | "enchant"
  | "no_effect";

type TimedEffect = "sunrise" | "sunset" | "no_effect";

type DynamicStatus = "dynamic_palette" | "none";

type Signal = "no_signal" | "on_off" | "on_off_color" | "alternating";

type GradientMode = "interpolated_palette" | "interpolated_palette_mirrored" | "random_pixelated" | "segmented_palette";

type ConfigurationStatus = "set" | "changing";

type PowerupPreset = "safety" | "powerfail" | "last_on_state" | "custom";

type DimmingDelta = {
  action: "up" | "down" | "stop";

  /**
   * number (0 - 100)
   *
   * Brightness percentage of full scale to add or subtract. Clips at the minimum and maximum brightness.
   */
  brightness_delta?: number;
};

type ColorTemperatureDelta = {
  action: "up" | "down" | "stop";

  /**
   * integer (0 - 950)
   *
   * Mirek to add or subtract. Clips at the light's mirek_schema.
   */
  mirek_delta?: number;
};

type SignalingRequest = {
  signal: Signal;

  /**
   * integer (maximum: 65534000)
   *
   * Duration in ms, in steps of 1 second. Ignored for no_signal.
   */
  duration: number;

  /**
   * 1 or 2 colors, for the signals that take them
   */
  colors?: Partial<Color>[];
};

type EffectV2Action = {
  effect: Effect;

  parameters?: {
    color?: Color;
    color_temperature?: { mirek: number };

    /**
     * number (0 - 1)
     */
    speed?: number;
  };
};

type EffectV2ActionRequest = {
  effect: Effect;

  parameters?: {
    color?: Partial<Color>;
    color_temperature?: { mirek?: number };

    /**
     * number (0 - 1)
     */
    speed?: number;
  };
};

export type Light = {
  type: "light";

  /**
   * Unique identifier representing a specific resource instance
   */
  id: string;

  /**
   * Clip v1 resource identifier
   */
  id_v1?: string;

  /**
   * Owner of the service. If the owner is deleted, the service is deleted too.
   */
  owner: ResourceIdentifier;

  metadata: {
    /**
     * Human-readable name of the resource (1 - 32 characters)
     */
    name: string;

    /**
     * Deprecated: use metadata on device level
     */
    archetype: LightArchetype;

    /**
     * integer (50 - 1000)
     *
     * The fixed mired value of the white lamp
     */
    fixed_mired?: number;

    function: LightFunction;
  };

  /**
   * Factory defaults. Name and archetype are only present for devices with multiple light services.
   */
  product_data?: {
    name?: string;
    archetype?: LightArchetype;
    function: LightFunction;
  };

  identify: Empty;

  /**
   * Service identification number. 0 indicates the service of a single instance.
   */
  service_id: number;

  on: On;

  dimming?: Dimming & {
    /**
     * number (0 - 100)
     *
     * Percentage of the maximum lumen the device outputs on minimum brightness
     */
    min_dim_level?: number;
  };

  dimming_delta?: Empty;

  dimming_configuration?: {
    status: ConfigurationStatus;

    /**
     * number (0 - 100)
     *
     * Brightness percentage
     */
    min_level: number;
  };

  color_temperature?: {
    /**
     * integer (50 - 1000)
     *
     * Color temperature in mirek, or null when the light color is not in the ct spectrum
     */
    mirek: number | null;

    /**
     * Indication whether the value presented in mirek is valid
     */
    mirek_valid: boolean;

    mirek_schema: {
      /**
       * integer (50 - 1000)
       *
       * Minimum color temperature this light supports
       */
      mirek_minimum: number;

      /**
       * integer (50 - 1000)
       *
       * Maximum color temperature this light supports
       */
      mirek_maximum: number;
    };
  };

  color_temperature_delta?: Empty;

  color?: Color & {
    /**
     * Color gamut of the bulb. Not present when a bulb does not report it.
     */
    gamut?: {
      red: Xy;
      green: Xy;
      blue: Xy;
    };

    /**
     * - A:     Gamut of early Philips color-only products
     * - B:     Limited gamut of first Hue color products
     * - C:     Richer color gamut of Hue white and color ambiance products
     * - other: Color gamut of non-hue products with non-hue gamuts resp w/o gamut
     */
    gamut_type: "A" | "B" | "C" | "other";
  };

  dynamics?: {
    status: DynamicStatus;

    /**
     * Statuses in which the light could be when playing dynamics
     */
    status_values: DynamicStatus[];

    /**
     * number (0 - 1)
     *
     * Speed of the dynamic palette. Only valid when status is dynamic_palette.
     */
    speed: number;

    speed_valid: boolean;
  };

  alert?: {
    /**
     * Alert effects the light supports
     */
    action_values: "breathe"[];
  };

  signaling?: {
    /**
     * Signals the light supports
     */
    signal_values: Signal[];

    /**
     * The active signal. Not present when no signal is active.
     */
    status?: {
      signal: Signal;

      /**
       * ISO 8601 time at which the signal is expected to end
       */
      estimated_end: string;

      colors: Color[];
    };
  };

  /**
   * streaming: an entertainment area controls the light
   */
  mode: "normal" | "streaming";

  gradient?: {
    /**
     * maxItems: 5
     */
    points: { color: Color }[];

    mode: GradientMode;

    /**
     * Number of color points the light can show with gradience
     */
    points_capable: number;

    mode_values: GradientMode[];

    /**
     * Number of pixels in the device
     */
    pixel_count?: number;
  };

  /**
   * Deprecated: use effects_v2
   */
  effects?: {
    status_values: Effect[];
    status: Effect;
    effect_values: Effect[];
  };

  effects_v2?: {
    action: {
      effect_values: Effect[];
    };

    status: {
      effect: Effect;
      effect_values: Effect[];

      parameters?: {
        color?: Color;

        color_temperature?: {
          /**
           * integer (50 - 1000)
           */
          mirek: number | null;

          mirek_valid: boolean;
        };

        /**
         * number (0 - 1)
         */
        speed: number;
      };
    };
  };

  timed_effects?: {
    status_values: TimedEffect[];
    status: TimedEffect;
    effect_values: TimedEffect[];
  };

  /**
   * How the light behaves when it gets power
   */
  powerup?: {
    preset: PowerupPreset;

    /**
     * Whether the values shown have been configured in the light
     */
    configured: boolean;

    on: {
      mode: "on" | "toggle" | "previous";
      on?: On;
    };

    dimming?: {
      mode: "dimming" | "previous";
      dimming?: Dimming;
    };

    color?: {
      mode: "color_temperature" | "color" | "previous";
      color_temperature?: { mirek: number };
      color?: Color;
    };
  };

  content_configuration?: {
    /**
     * Orientation of content on pixelated products, e.g. for sunrise and candle
     */
    orientation?: {
      status: ConfigurationStatus;
      configurable: boolean;
      orientation: "horizontal" | "vertical";
    };

    /**
     * Order in which the content is represented on the pixels
     */
    order?: {
      status: ConfigurationStatus;
      configurable: boolean;
      order: "forward" | "reversed";
    };

    association?: {
      /**
       * screen: placed behind or around a screen, following an arc
       */
      association: "not_associated" | "screen";
    };
  };

  geometry?: {
    /**
     * maxItems: 5. Positions range from -100 to 100 meters.
     */
    pixel_positions?: { index: number; position: Position }[];
  };
};

export type LightRequest = {
  type?: "light";
  id?: string;

  metadata?: {
    /**
     * minLength: 1, maxLength: 32
     */
    name?: string;

    /**
     * Deprecated: use metadata on device level
     */
    archetype?: LightArchetype;

    function?: LightFunction;
  };

  identify?: {
    action: "identify";

    /**
     * Duration of the identify cycle in ms
     */
    duration?: number;
  };

  on?: Partial<On>;
  dimming?: Partial<Dimming>;
  dimming_delta?: DimmingDelta;

  dimming_configuration?: {
    /**
     * number (0 - 100)
     */
    min_level: number;
  };

  color_temperature?: {
    /**
     * integer (50 - 1000)
     */
    mirek?: number;
  };

  color_temperature_delta?: ColorTemperatureDelta;
  color?: Partial<Color>;

  dynamics?: {
    /**
     * Duration of a light transition in ms
     */
    duration?: number;

    /**
     * number (0 - 1)
     *
     * Speed of the dynamic palette
     */
    speed?: number;
  };

  alert?: { action: "breathe" };
  signaling?: SignalingRequest;

  gradient?: {
    /**
     * 2 - 5 points
     */
    points: { color: Partial<Color> }[];

    mode?: GradientMode;
  };

  /**
   * Deprecated: use effects_v2
   */
  effects?: { effect?: Effect };

  effects_v2?: { action?: EffectV2ActionRequest };

  timed_effects?: {
    effect?: TimedEffect;

    /**
     * integer (maximum: 21600000)
     *
     * Duration in ms. Required unless the effect is no_effect.
     */
    duration?: number;
  };

  powerup?: {
    /**
     * Only the custom preset takes the other properties.
     */
    preset: PowerupPreset;

    on?: {
      mode: "on" | "toggle" | "previous";
      on?: Partial<On>;
    };

    dimming?: {
      mode: "dimming" | "previous";
      dimming?: Partial<Dimming>;
    };

    color?: {
      mode: "color_temperature" | "color" | "previous";
      color_temperature?: { mirek?: number };
      color?: Partial<Color>;
    };
  };

  content_configuration?: {
    orientation?: { orientation?: "horizontal" | "vertical" };
    order?: { order?: "forward" | "reversed" };
    association?: { association?: "not_associated" | "screen" };
  };

  geometry?: {
    pixel_positions?: { index: number; position: Position }[];
  };
};

export type GroupedLight = {
  type: "grouped_light";

  /**
   * Unique identifier representing a specific resource instance
   */
  id: string;

  /**
   * Clip v1 resource identifier
   */
  id_v1?: string;

  /**
   * Owner of the service. If the owner is deleted, the service is deleted too.
   */
  owner: ResourceIdentifier;

  /**
   * Joined on control & aggregated on state.
   *
   * “on” is true if any light in the group is on.
   */
  on?: On;

  /**
   * Joined dimming control
   *
   * “dimming.brightness” contains average brightness of the group containing turned-on lights only.
   */
  dimming?: Dimming;

  dimming_delta?: Empty;

  /**
   * Joined color temperature control
   */
  color_temperature?: Empty;

  color_temperature_delta?: Empty;

  /**
   * Joined color control. Only present when a light in the group supports color.
   */
  color?: Empty;

  alert?: {
    /**
     * Alert effects the lights support
     */
    action_values: "breathe"[];
  };

  signaling?: {
    /**
     * Signals the lights support
     */
    signal_values: Signal[];
  };

  dynamics?: Empty;
};

export type GroupedLightRequest = {
  type?: "grouped_light";
  id?: string;
  on?: Partial<On>;
  dimming?: Partial<Dimming>;
  dimming_delta?: DimmingDelta;

  color_temperature?: {
    /**
     * integer (50 - 1000)
     */
    mirek?: number;
  };

  color_temperature_delta?: ColorTemperatureDelta;
  color?: Partial<Color>;
  alert?: { action: "breathe" };
  signaling?: SignalingRequest;

  dynamics?: {
    /**
     * Duration of a light transition in ms
     */
    duration?: number;
  };
};

type SceneAction = {
  on?: On;
  dimming?: Dimming;
  color?: Color;

  color_temperature?: {
    /**
     * integer (50 - 1000)
     */
    mirek: number;
  };

  gradient?: {
    /**
     * maxItems: 5
     */
    points: { color: Color }[];

    mode: GradientMode;
  };

  /**
   * Deprecated: use effects_v2
   */
  effects?: { effect: Effect };

  effects_v2?: { action: EffectV2Action };

  dynamics?: {
    /**
     * Duration of a light transition in ms
     */
    duration?: number;
  };
};

export type Scene = {
  type: "scene";

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

    action: SceneAction;
  }[];

  /**
   * Group of colors that describe the palette of colors to be used when playing dynamics
   */
  palette?: {
    /**
     * maxItems: 9
     */
    color: { color: Color; dimming: Dimming }[];

    /**
     * maxItems: 1
     */
    dimming: Dimming[];

    /**
     * maxItems: 1
     */
    color_temperature: {
      color_temperature: {
        /**
         * integer (50 - 1000)
         */
        mirek: number;
      };

      dimming: Dimming;
    }[];

    /**
     * maxItems: 3. Deprecated: use effects_v2
     */
    effects: { effect: Effect }[];

    /**
     * maxItems: 3
     */
    effects_v2: { action: EffectV2Action }[];
  };

  recall: Empty;

  metadata: {
    /**
     * Human-readable name of the resource (1 - 32 characters)
     */
    name: string;

    /**
     * Reference with a unique identifier for the image representing the scene
     */
    image?: ResourceIdentifier;

    /**
     * Application specific data (1 - 16 characters)
     */
    appdata?: string;
  };

  /**
   * Group associated with this Scene
   *
   * All services in the group are part of this scene.
   * If the group is changed (e.g., light added/removed), the scene is updated.
   */
  group: ResourceIdentifier;

  /**
   * number (0 - 1)
   *
   * Speed of the dynamic palette for this scene
   */
  speed: number;

  /**
   * Whether recalling the scene starts it dynamically
   */
  auto_dynamic: boolean;

  status: {
    active?: "inactive" | "static" | "dynamic_palette";

    /**
     * ISO 8601 time of the last recall
     */
    last_recall?: string;
  };

  /**
   * Only available on bridges with SpatialAware
   */
  mapping?: {
    algorithm?: "classic" | "spatial";
  };

  last_actions_update?: {
    /**
     * autogrow: the bridge updated the actions because lights joined or left the group
     */
    source: "clip" | "autogrow";
  };
};

export type SceneRequest = {
  type?: "scene";
  id?: string;

  actions?: {
    target: ResourceIdentifier;

    action: {
      on?: Partial<On>;
      dimming?: Partial<Dimming>;
      color?: Partial<Color>;
      color_temperature?: { mirek?: number };
      gradient?: { points: { color: Partial<Color> }[]; mode?: GradientMode };

      /**
       * Deprecated: use effects_v2
       */
      effects?: { effect?: Effect };

      effects_v2?: { action?: EffectV2ActionRequest };
      dynamics?: { duration?: number };
    };
  }[];

  palette?: {
    color: { color: Partial<Color>; dimming: Partial<Dimming> }[];
    dimming: Partial<Dimming>[];
    color_temperature: { color_temperature: { mirek?: number }; dimming: Partial<Dimming> }[];

    /**
     * Deprecated: use effects_v2
     */
    effects?: { effect?: Effect }[];

    effects_v2?: { action?: EffectV2ActionRequest }[];
  };

  recall?: {
    /**
     * When writing active, the actions in the scene are executed on the target.
     *
     * dynamic_palette starts a dynamic scene with colors in the Palette object.
     */
    action?: "active" | "dynamic_palette" | "static";

    /**
     * Transition to the scene within the timeframe given by duration, in ms
     */
    duration?: number;

    /**
     * Override the scene dimming/brightness
     */
    dimming?: Partial<Dimming>;
  };

  metadata?: {
    name?: string;
    appdata?: string;
  };

  speed?: number;
  auto_dynamic?: boolean;

  mapping?: {
    algorithm?: "classic" | "spatial";
  };
};

type GroupBase = {
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
   * References all services aggregating control and state of children in the group, per service type:
   * grouped_light, grouped_motion and grouped_light_level.
   */
  services: ResourceIdentifier[];

  metadata: {
    /**
     * Human-readable name of the resource (1 - 32 characters)
     */
    name: string;

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

/**
 * Rooms group devices, and each device can only be part of one room.
 */
export type Room = GroupBase & {
  type: "room";

  /**
   * Positions of the room's device services
   */
  geometry?: {
    objects?: {
      reference: ResourceIdentifier;

      transform: {
        /**
         * In meters
         */
        position: Position;

        /**
         * A quaternion, each value from -1 to 1
         */
        rotation: Position & { w: number };
      };
    }[];
  };
};

/**
 * Zones group services, and each service can be part of multiple zones.
 */
export type Zone = GroupBase & {
  type: "zone";
};

export type Group = Room | Zone;

export type ZigbeeConnectivity = {
  type: "zigbee_connectivity";

  /**
   * Unique identifier representing a specific resource instance
   */
  id: string;

  /**
   * Clip v1 resource identifier
   */
  id_v1?: string;

  /**
   * Owner of the service. If the owner is deleted, the service is deleted too.
   */
  owner: ResourceIdentifier;

  /**
   * connected: the device has recently been available. connectivity_issue: the device is powered off or has network
   * issues. unidirectional_incoming: the device only talks to the bridge. pending_discovery: the device is expected to
   * be added to the network soon.
   */
  status: "connected" | "disconnected" | "connectivity_issue" | "unidirectional_incoming" | "pending_discovery";

  /**
   * Unique identifier of a Zigbee device on the network
   */
  mac_address: string;

  channel?: {
    status: "set" | "changing";

    /**
     * Current Zigbee channel. If recently changed, the channel it is changing to.
     */
    value?: "channel_11" | "channel_15" | "channel_20" | "channel_25" | "not_configured";
  };

  /**
   * Extended pan ID of the Zigbee network
   */
  extended_pan_id?: string;
};

/**
 * The whole home: every room, and the devices in none. Its grouped light controls every light.
 */
export type BridgeHome = {
  type: "bridge_home";

  /**
   * Unique identifier representing a specific resource instance
   */
  id: string;

  /**
   * Clip v1 resource identifier
   */
  id_v1?: string;

  /**
   * Child devices and services to group
   */
  children: ResourceIdentifier[];

  /**
   * Services aggregating the children's: grouped_light, grouped_motion and grouped_light_level
   */
  services: ResourceIdentifier[];
};

export type HueResource = Light | GroupedLight | Scene | Room | Zone | BridgeHome | ZigbeeConnectivity;

type ChangedResource<R> = R extends HueResource ? Pick<R, "id" | "type"> & DeepPartial<R> : never;

/**
 * An event from the event stream, its data in the shape of a GET response: whole resources for an add, their IDs for a
 * delete, and only the properties that changed for an update.
 */
export type HueEvent = {
  /**
   * A UUID that identifies this batch of events
   */
  id: string;

  /**
   * ISO 8601 time of creation
   */
  creationtime: string;

  type: "add" | "update" | "delete" | "error";

  data: (ChangedResource<HueResource> | { id: string; type: Exclude<ResourceType, HueResource["type"]> })[];
};
