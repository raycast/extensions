// API Response wrapper
export interface ApiResponse<T> {
  errors: ApiError[];
  data: T[];
}

export interface ApiError {
  description: string;
}

// Resource identifier used for references
export interface ResourceIdentifier {
  rid: string;
  rtype: ResourceType;
}

export type ResourceType =
  | "device"
  | "bridge_home"
  | "room"
  | "zone"
  | "light"
  | "button"
  | "temperature"
  | "light_level"
  | "motion"
  | "grouped_light"
  | "device_power"
  | "bridge"
  | "scene"
  | "smart_scene";

// Light types
export interface Light {
  id: string;
  id_v1?: string;
  type: "light";
  owner: ResourceIdentifier;
  metadata: LightMetadata;
  on: OnState;
  dimming?: Dimming;
  color_temperature?: ColorTemperature;
  color?: Color;
  dynamics?: Dynamics;
  mode: "normal" | "streaming";
}

export interface LightMetadata {
  name: string;
  archetype: string;
  fixed_mired?: number;
}

export interface OnState {
  on: boolean;
}

export interface Dimming {
  brightness: number;
  min_dim_level?: number;
}

export interface ColorTemperature {
  mirek: number | null;
  mirek_valid: boolean;
  mirek_schema?: {
    mirek_minimum: number;
    mirek_maximum: number;
  };
}

export interface Color {
  xy: GamutPosition;
  gamut?: {
    red: GamutPosition;
    green: GamutPosition;
    blue: GamutPosition;
  };
  gamut_type?: "A" | "B" | "C" | "other";
}

export interface GamutPosition {
  x: number;
  y: number;
}

export interface Dynamics {
  status: "dynamic_palette" | "none";
  speed: number;
  speed_valid: boolean;
}

// Light update payload
export interface LightPut {
  on?: OnState;
  dimming?: { brightness: number };
  color_temperature?: { mirek: number };
  color?: { xy: GamutPosition };
  dynamics?: { duration?: number; speed?: number };
}

// Room types
export interface Room {
  id: string;
  id_v1?: string;
  type: "room";
  children: ResourceIdentifier[];
  services: ResourceIdentifier[];
  metadata: RoomMetadata;
}

export interface RoomMetadata {
  name: string;
  archetype: RoomArchetype;
}

export type RoomArchetype =
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

// Grouped light (for room control)
export interface GroupedLight {
  id: string;
  id_v1?: string;
  type: "grouped_light";
  owner: ResourceIdentifier;
  on: OnState;
  dimming?: Dimming;
  alert?: {
    action_values: string[];
  };
}

export interface GroupedLightPut {
  on?: OnState;
  dimming?: { brightness: number };
  color_temperature?: { mirek: number };
  color?: { xy: GamutPosition };
  dynamics?: { duration?: number };
}

// Scene types
export interface Scene {
  id: string;
  id_v1?: string;
  type: "scene";
  actions: SceneAction[];
  metadata: SceneMetadata;
  group: ResourceIdentifier;
  palette?: ScenePalette;
  speed: number;
  auto_dynamic: boolean;
  status?: {
    active: "inactive" | "static" | "dynamic_palette";
  };
}

export interface SceneAction {
  target: ResourceIdentifier;
  action: {
    on?: OnState;
    dimming?: Dimming;
    color?: Color;
    color_temperature?: ColorTemperature;
  };
}

export interface SceneMetadata {
  name: string;
  image?: ResourceIdentifier;
  appdata?: string;
}

export interface ScenePalette {
  color?: Array<{ color: Color; dimming: Dimming }>;
  dimming?: Dimming[];
  color_temperature?: Array<{ color_temperature: { mirek: number }; dimming: Dimming }>;
}

export interface ScenePut {
  recall?: {
    action: "active" | "dynamic_palette" | "static";
    duration?: number;
    dimming?: { brightness: number };
  };
  metadata?: Partial<SceneMetadata>;
  actions?: SceneAction[];
  palette?: ScenePalette;
  speed?: number;
  auto_dynamic?: boolean;
}

// Device types
export interface Device {
  id: string;
  id_v1?: string;
  type: "device";
  product_data: ProductData;
  metadata: DeviceMetadata;
  services: ResourceIdentifier[];
}

export interface ProductData {
  model_id: string;
  manufacturer_name: string;
  product_name: string;
  product_archetype: string;
  certified: boolean;
  software_version: string;
}

export interface DeviceMetadata {
  name: string;
  archetype: string;
}

// Bridge discovery response
export interface BridgeDiscovery {
  id: string;
  internalipaddress: string;
  port?: number;
}

// Authentication response
export interface AuthResponse {
  success?: {
    username: string;
    clientkey: string;
  };
  error?: {
    type: number;
    address: string;
    description: string;
  };
}
