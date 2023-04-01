export type Light = {
    id:                      string;
    // id_v1:                   string;
    owner:                   Owner;
    metadata:                Metadata;
    on:                      LightOn;
    dimming:                 LightDimming;
    dimming_delta:           Delta;
    color_temperature:       LightColorTemperature;
    color_temperature_delta: Delta;
    // dynamics:                Dynamics;
    // alert:                   Alert;
    // signaling:               Signaling;
    mode:                    string;
    // effects:                 Effects;
    // powerup:                 Powerup;
    type:                    string;
}

export type Alert = {
    action_values: string[];
}

export type LightColorTemperature = {
    mirek:        number;
    mirek_valid:  boolean;
    mirek_schema: MirekSchema;
}

export type MirekSchema = {
    mirek_minimum: number;
    mirek_maximum: number;
}

export type Delta = {
}

export type LightDimming = {
    brightness:    number;
    min_dim_level: number;
}

export type Dynamics = {
    status:        string;
    status_values: string[];
    speed:         number;
    speed_valid:   boolean;
}

export type Effects = {
    status_values: string[];
    status:        string;
    effect_values: string[];
}

export type Metadata = {
    name:      string;
    archetype: string;
}

export type LightOn = {
    on: boolean;
}

export type Owner = {
    rid:   string;
    rtype: string;
}

export type Powerup = {
    preset:     string;
    configured: boolean;
    on:         PowerupOn;
    dimming:    PowerupDimming;
    color:      Color;
}

export type Color = {
    mode:              string;
    color_temperature: ColorColorTemperature;
}

export type ColorColorTemperature = {
    mirek: number;
}

export type PowerupDimming = {
    mode:    string;
    dimming: DimmingDimming;
}

export type DimmingDimming = {
    brightness: number;
}

export type PowerupOn = {
    mode: string;
    on:   LightOn;
}

export type Signaling = {
    signal_values: string[];
}
