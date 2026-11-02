// Resources from a real bridge, anonymised: fake UUIDs (except Hue's public scene images), English names, fake scene
// keys and recall times. Typed literals, so tsc checks the types against real responses.
import type { BridgeHome, GroupedLight, Light, Room, Scene, Zone, ZigbeeConnectivity } from "../../src/lib/types";

export const lights: Light[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    id_v1: "/lights/9",
    owner: {
      rid: "00000000-0000-4000-8000-000000000002",
      rtype: "device",
    },
    metadata: {
      name: "Kitchen pendant",
      archetype: "pendant_round",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 100,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 366,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    id_v1: "/lights/15",
    owner: {
      rid: "00000000-0000-4000-8000-000000000004",
      rtype: "device",
    },
    metadata: {
      name: "Living room floor lamp 2",
      archetype: "floor_shade",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 446,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 367,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    id_v1: "/lights/14",
    owner: {
      rid: "00000000-0000-4000-8000-000000000006",
      rtype: "device",
    },
    metadata: {
      name: "Living room plug",
      archetype: "wall_washer",
      function: "functional",
    },
    product_data: {
      function: "functional",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: [],
    },
    mode: "normal",
    powerup: {
      preset: "powerfail",
      configured: true,
      on: {
        mode: "previous",
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    id_v1: "/lights/3",
    owner: {
      rid: "00000000-0000-4000-8000-000000000008",
      rtype: "device",
    },
    metadata: {
      name: "Living room spot 3",
      archetype: "double_spot",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 447,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 500,
      },
    },
    color_temperature_delta: {},
    color: {
      xy: {
        x: 0.5019,
        y: 0.4152,
      },
      gamut: {
        red: {
          x: 0.6915,
          y: 0.3083,
        },
        green: {
          x: 0.17,
          y: 0.7,
        },
        blue: {
          x: 0.1532,
          y: 0.0475,
        },
      },
      gamut_type: "C",
    },
    dynamics: {
      status: "none",
      status_values: ["none", "dynamic_palette"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off", "on_off_color", "alternating"],
    },
    mode: "normal",
    effects: {
      status_values: [
        "no_effect",
        "candle",
        "fire",
        "prism",
        "sparkle",
        "opal",
        "glisten",
        "underwater",
        "cosmos",
        "sunbeam",
        "enchant",
      ],
      status: "no_effect",
      effect_values: [
        "no_effect",
        "candle",
        "fire",
        "prism",
        "sparkle",
        "opal",
        "glisten",
        "underwater",
        "cosmos",
        "sunbeam",
        "enchant",
      ],
    },
    effects_v2: {
      action: {
        effect_values: [
          "no_effect",
          "candle",
          "fire",
          "prism",
          "sparkle",
          "opal",
          "glisten",
          "underwater",
          "cosmos",
          "sunbeam",
          "enchant",
        ],
      },
      status: {
        effect: "no_effect",
        effect_values: [
          "no_effect",
          "candle",
          "fire",
          "prism",
          "sparkle",
          "opal",
          "glisten",
          "underwater",
          "cosmos",
          "sunbeam",
          "enchant",
        ],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000009",
    id_v1: "/lights/7",
    owner: {
      rid: "00000000-0000-4000-8000-000000000010",
      rtype: "device",
    },
    metadata: {
      name: "Office pendant 2",
      archetype: "pendant_round",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.13,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 446,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 367,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    id_v1: "/lights/12",
    owner: {
      rid: "00000000-0000-4000-8000-000000000012",
      rtype: "device",
    },
    metadata: {
      name: "Living room floor lamp 1",
      archetype: "floor_shade",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 446,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    id_v1: "/lights/6",
    owner: {
      rid: "00000000-0000-4000-8000-000000000014",
      rtype: "device",
    },
    metadata: {
      name: "Studio candle",
      archetype: "candle_bulb",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 443,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000015",
    id_v1: "/lights/2",
    owner: {
      rid: "00000000-0000-4000-8000-000000000016",
      rtype: "device",
    },
    metadata: {
      name: "Living room spot 2",
      archetype: "double_spot",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 447,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 500,
      },
    },
    color_temperature_delta: {},
    color: {
      xy: {
        x: 0.5019,
        y: 0.4152,
      },
      gamut: {
        red: {
          x: 0.6915,
          y: 0.3083,
        },
        green: {
          x: 0.17,
          y: 0.7,
        },
        blue: {
          x: 0.1532,
          y: 0.0475,
        },
      },
      gamut_type: "C",
    },
    dynamics: {
      status: "none",
      status_values: ["none", "dynamic_palette"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off", "on_off_color", "alternating"],
    },
    mode: "normal",
    effects: {
      status_values: [
        "no_effect",
        "candle",
        "fire",
        "prism",
        "sparkle",
        "opal",
        "glisten",
        "underwater",
        "cosmos",
        "sunbeam",
        "enchant",
      ],
      status: "no_effect",
      effect_values: [
        "no_effect",
        "candle",
        "fire",
        "prism",
        "sparkle",
        "opal",
        "glisten",
        "underwater",
        "cosmos",
        "sunbeam",
        "enchant",
      ],
    },
    effects_v2: {
      action: {
        effect_values: [
          "no_effect",
          "candle",
          "fire",
          "prism",
          "sparkle",
          "opal",
          "glisten",
          "underwater",
          "cosmos",
          "sunbeam",
          "enchant",
        ],
      },
      status: {
        effect: "no_effect",
        effect_values: [
          "no_effect",
          "candle",
          "fire",
          "prism",
          "sparkle",
          "opal",
          "glisten",
          "underwater",
          "cosmos",
          "sunbeam",
          "enchant",
        ],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000017",
    id_v1: "/lights/4",
    owner: {
      rid: "00000000-0000-4000-8000-000000000018",
      rtype: "device",
    },
    metadata: {
      name: "Office pendant 1",
      archetype: "pendant_round",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.13,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 446,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 367,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000019",
    id_v1: "/lights/10",
    owner: {
      rid: "00000000-0000-4000-8000-000000000020",
      rtype: "device",
    },
    metadata: {
      name: "Studio ceiling lamp",
      archetype: "ceiling_round",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 447,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000021",
    id_v1: "/lights/13",
    owner: {
      rid: "00000000-0000-4000-8000-000000000022",
      rtype: "device",
    },
    metadata: {
      name: "Office pendant 3",
      archetype: "pendant_round",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.13,
      min_dim_level: 1,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 443,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 367,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000023",
    id_v1: "/lights/1",
    owner: {
      rid: "00000000-0000-4000-8000-000000000024",
      rtype: "device",
    },
    metadata: {
      name: "Living room spot 1",
      archetype: "double_spot",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 447,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 500,
      },
    },
    color_temperature_delta: {},
    color: {
      xy: {
        x: 0.5019,
        y: 0.4152,
      },
      gamut: {
        red: {
          x: 0.6915,
          y: 0.3083,
        },
        green: {
          x: 0.17,
          y: 0.7,
        },
        blue: {
          x: 0.1532,
          y: 0.0475,
        },
      },
      gamut_type: "C",
    },
    dynamics: {
      status: "none",
      status_values: ["none", "dynamic_palette"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off", "on_off_color", "alternating"],
    },
    mode: "normal",
    effects: {
      status_values: [
        "no_effect",
        "candle",
        "fire",
        "prism",
        "sparkle",
        "opal",
        "glisten",
        "underwater",
        "cosmos",
        "sunbeam",
        "enchant",
      ],
      status: "no_effect",
      effect_values: [
        "no_effect",
        "candle",
        "fire",
        "prism",
        "sparkle",
        "opal",
        "glisten",
        "underwater",
        "cosmos",
        "sunbeam",
        "enchant",
      ],
    },
    effects_v2: {
      action: {
        effect_values: [
          "no_effect",
          "candle",
          "fire",
          "prism",
          "sparkle",
          "opal",
          "glisten",
          "underwater",
          "cosmos",
          "sunbeam",
          "enchant",
        ],
      },
      status: {
        effect: "no_effect",
        effect_values: [
          "no_effect",
          "candle",
          "fire",
          "prism",
          "sparkle",
          "opal",
          "glisten",
          "underwater",
          "cosmos",
          "sunbeam",
          "enchant",
        ],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000025",
    id_v1: "/lights/16",
    owner: {
      rid: "00000000-0000-4000-8000-000000000026",
      rtype: "device",
    },
    metadata: {
      name: "Living room floor lamp 3",
      archetype: "floor_shade",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 446,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 367,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000027",
    id_v1: "/lights/11",
    owner: {
      rid: "00000000-0000-4000-8000-000000000028",
      rtype: "device",
    },
    metadata: {
      name: "Bedroom candle",
      archetype: "candle_bulb",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 446,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000029",
    id_v1: "/lights/5",
    owner: {
      rid: "00000000-0000-4000-8000-000000000030",
      rtype: "device",
    },
    metadata: {
      name: "Office candle",
      archetype: "candle_bulb",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.13,
      min_dim_level: 2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 443,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 366,
        },
      },
    },
    type: "light",
  },
  {
    id: "00000000-0000-4000-8000-000000000031",
    id_v1: "/lights/17",
    owner: {
      rid: "00000000-0000-4000-8000-000000000032",
      rtype: "device",
    },
    metadata: {
      name: "Living room floor lamp 4",
      archetype: "floor_shade",
      function: "mixed",
    },
    product_data: {
      function: "mixed",
    },
    identify: {},
    service_id: 0,
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
      min_dim_level: 0.2,
    },
    dimming_delta: {},
    color_temperature: {
      mirek: 447,
      mirek_valid: true,
      mirek_schema: {
        mirek_minimum: 153,
        mirek_maximum: 454,
      },
    },
    color_temperature_delta: {},
    dynamics: {
      status: "none",
      status_values: ["none"],
      speed: 0,
      speed_valid: false,
    },
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    mode: "normal",
    effects: {
      status_values: ["no_effect", "candle", "sparkle", "glisten"],
      status: "no_effect",
      effect_values: ["no_effect", "candle", "sparkle", "glisten"],
    },
    effects_v2: {
      action: {
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
      status: {
        effect: "no_effect",
        effect_values: ["no_effect", "candle", "sparkle", "glisten"],
      },
    },
    timed_effects: {
      status_values: ["no_effect", "sunrise", "sunset"],
      status: "no_effect",
      effect_values: ["no_effect", "sunrise", "sunset"],
    },
    powerup: {
      preset: "safety",
      configured: true,
      on: {
        mode: "on",
        on: {
          on: true,
        },
      },
      dimming: {
        mode: "dimming",
        dimming: {
          brightness: 100,
        },
      },
      color: {
        mode: "color_temperature",
        color_temperature: {
          mirek: 367,
        },
      },
    },
    type: "light",
  },
];

export const groupedLights: GroupedLight[] = [
  {
    id: "00000000-0000-4000-8000-000000000033",
    id_v1: "/groups/0",
    owner: {
      rid: "00000000-0000-4000-8000-000000000034",
      rtype: "bridge_home",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 59.31,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    color: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["alternating", "no_signal", "on_off", "on_off_color"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000035",
    id_v1: "/groups/83",
    owner: {
      rid: "00000000-0000-4000-8000-000000000036",
      rtype: "zone",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.3,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000037",
    id_v1: "/groups/2",
    owner: {
      rid: "00000000-0000-4000-8000-000000000038",
      rtype: "room",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000039",
    id_v1: "/groups/86",
    owner: {
      rid: "00000000-0000-4000-8000-000000000040",
      rtype: "zone",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 61.31,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    color: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["alternating", "no_signal", "on_off", "on_off_color"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000041",
    id_v1: "/groups/1",
    owner: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    color: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["alternating", "no_signal", "on_off", "on_off_color"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000043",
    id_v1: "/groups/85",
    owner: {
      rid: "00000000-0000-4000-8000-000000000044",
      rtype: "room",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 100,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000045",
    id_v1: "/groups/82",
    owner: {
      rid: "00000000-0000-4000-8000-000000000046",
      rtype: "room",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.13,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000047",
    id_v1: "/groups/87",
    owner: {
      rid: "00000000-0000-4000-8000-000000000048",
      rtype: "private_group",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.41,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    color: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["alternating", "no_signal", "on_off", "on_off_color"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000049",
    id_v1: "/groups/81",
    owner: {
      rid: "00000000-0000-4000-8000-000000000050",
      rtype: "private_group",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 59.31,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    color: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["alternating", "no_signal", "on_off", "on_off_color"],
    },
    dynamics: {},
    type: "grouped_light",
  },
  {
    id: "00000000-0000-4000-8000-000000000051",
    id_v1: "/groups/7",
    owner: {
      rid: "00000000-0000-4000-8000-000000000052",
      rtype: "room",
    },
    on: {
      on: true,
    },
    dimming: {
      brightness: 56.52,
    },
    dimming_delta: {},
    color_temperature: {},
    color_temperature_delta: {},
    alert: {
      action_values: ["breathe"],
    },
    signaling: {
      signal_values: ["no_signal", "on_off"],
    },
    dynamics: {},
    type: "grouped_light",
  },
];

export const rooms: Room[] = [
  {
    id: "00000000-0000-4000-8000-000000000046",
    id_v1: "/groups/82",
    children: [
      {
        rid: "00000000-0000-4000-8000-000000000030",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000010",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000022",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000018",
        rtype: "device",
      },
    ],
    services: [
      {
        rid: "00000000-0000-4000-8000-000000000045",
        rtype: "grouped_light",
      },
    ],
    metadata: {
      name: "Office",
      archetype: "computer",
    },
    type: "room",
  },
  {
    id: "00000000-0000-4000-8000-000000000042",
    id_v1: "/groups/1",
    children: [
      {
        rid: "00000000-0000-4000-8000-000000000004",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000026",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000032",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000006",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000008",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000012",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000016",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000024",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000053",
        rtype: "device",
      },
    ],
    services: [
      {
        rid: "00000000-0000-4000-8000-000000000041",
        rtype: "grouped_light",
      },
    ],
    metadata: {
      name: "Living room",
      archetype: "living_room",
    },
    type: "room",
  },
  {
    id: "00000000-0000-4000-8000-000000000054",
    id_v1: "/groups/3",
    children: [],
    services: [],
    metadata: {
      name: "Hallway",
      archetype: "hallway",
    },
    type: "room",
  },
  {
    id: "00000000-0000-4000-8000-000000000052",
    id_v1: "/groups/7",
    children: [
      {
        rid: "00000000-0000-4000-8000-000000000028",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000055",
        rtype: "device",
      },
    ],
    services: [
      {
        rid: "00000000-0000-4000-8000-000000000051",
        rtype: "grouped_light",
      },
    ],
    metadata: {
      name: "Bedroom",
      archetype: "bedroom",
    },
    type: "room",
  },
  {
    id: "00000000-0000-4000-8000-000000000044",
    id_v1: "/groups/85",
    children: [
      {
        rid: "00000000-0000-4000-8000-000000000002",
        rtype: "device",
      },
    ],
    services: [
      {
        rid: "00000000-0000-4000-8000-000000000043",
        rtype: "grouped_light",
      },
    ],
    metadata: {
      name: "Kitchen",
      archetype: "kitchen",
    },
    type: "room",
  },
  {
    id: "00000000-0000-4000-8000-000000000038",
    id_v1: "/groups/2",
    children: [
      {
        rid: "00000000-0000-4000-8000-000000000014",
        rtype: "device",
      },
      {
        rid: "00000000-0000-4000-8000-000000000020",
        rtype: "device",
      },
    ],
    services: [
      {
        rid: "00000000-0000-4000-8000-000000000037",
        rtype: "grouped_light",
      },
    ],
    metadata: {
      name: "Studio",
      archetype: "studio",
    },
    type: "room",
  },
  {
    id: "00000000-0000-4000-8000-000000000056",
    id_v1: "/groups/84",
    children: [],
    services: [],
    metadata: {
      name: "Landing",
      archetype: "staircase",
    },
    type: "room",
  },
];

export const zones: Zone[] = [
  {
    id: "00000000-0000-4000-8000-000000000040",
    id_v1: "/groups/86",
    children: [
      {
        rid: "00000000-0000-4000-8000-000000000003",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000025",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000031",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000001",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000005",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000023",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000015",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000007",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000011",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000009",
        rtype: "light",
      },
    ],
    services: [
      {
        rid: "00000000-0000-4000-8000-000000000039",
        rtype: "grouped_light",
      },
    ],
    metadata: {
      name: "Downstairs",
      archetype: "downstairs",
    },
    type: "zone",
  },
  {
    id: "00000000-0000-4000-8000-000000000036",
    id_v1: "/groups/83",
    children: [
      {
        rid: "00000000-0000-4000-8000-000000000017",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000013",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000019",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000029",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000027",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000021",
        rtype: "light",
      },
      {
        rid: "00000000-0000-4000-8000-000000000009",
        rtype: "light",
      },
    ],
    services: [
      {
        rid: "00000000-0000-4000-8000-000000000035",
        rtype: "grouped_light",
      },
    ],
    metadata: {
      name: "Upstairs",
      archetype: "upstairs",
    },
    type: "zone",
  },
];

export const bridgeHome: BridgeHome[] = [
  {
    id: "00000000-0000-4000-8000-000000000034",
    id_v1: "/groups/0",
    children: [
      { rid: "00000000-0000-4000-8000-000000000097", rtype: "device" },
      { rid: "00000000-0000-4000-8000-000000000046", rtype: "room" },
      { rid: "00000000-0000-4000-8000-000000000042", rtype: "room" },
      { rid: "00000000-0000-4000-8000-000000000054", rtype: "room" },
      { rid: "00000000-0000-4000-8000-000000000052", rtype: "room" },
      { rid: "00000000-0000-4000-8000-000000000044", rtype: "room" },
      { rid: "00000000-0000-4000-8000-000000000038", rtype: "room" },
      { rid: "00000000-0000-4000-8000-000000000056", rtype: "room" },
    ],
    services: [{ rid: "00000000-0000-4000-8000-000000000033", rtype: "grouped_light" }],
    type: "bridge_home",
  },
];

export const scenes: Scene[] = [
  {
    id: "00000000-0000-4000-8000-000000000057",
    id_v1: "/scenes/APcq5JXkyDSft8Ma",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000001",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color: {
            xy: {
              x: 0.5609999,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color: {
            xy: {
              x: 0.5609999,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color: {
            xy: {
              x: 0.5609999,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000009",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 10,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.5609999,
              y: 0.4042,
            },
          },
          dimming: {
            brightness: 0,
          },
        },
      ],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 500,
          },
          dimming: {
            brightness: 10,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Nightlight",
      image: {
        rid: "28bbfeff-1a0c-444e-bb4b-0b74b88e0c95",
        rtype: "public_image",
      },
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000040",
      rtype: "zone",
    },
    speed: 0.603,
    auto_dynamic: false,
    status: {
      active: "inactive",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000058",
    id_v1: "/scenes/HWjxCRes7LZn2FUh",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000013",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000019",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 447,
          },
          dimming: {
            brightness: 56.52,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Relax",
      image: {
        rid: "a1f7da49-d181-4328-abea-68c9dc4b5416",
        rtype: "public_image",
      },
      appdata: "Zn2FU_r02_d01",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000038",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "static",
      last_recall: "2026-01-02T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000059",
    id_v1: "/scenes/Qdr6KYmzETgu9Nbp",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000001",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 156,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 156,
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Energize",
      image: {
        rid: "7fd2ccc5-5749-4142-b7a5-66405a676f03",
        rtype: "public_image",
      },
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000044",
      rtype: "room",
    },
    speed: 0.603,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-03T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000060",
    id_v1: "/scenes/XkyDSft8Mao3GViw",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 370,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 370,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 370,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 370,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 370,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 370,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 370,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 370,
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Bright",
      image: {
        rid: "732ff1d9-76a7-4630-aad0-c8acc499bb0b",
        rtype: "public_image",
      },
      appdata: "o3GVi_r01_d05",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    speed: 0.6031746,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-04T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000061",
    id_v1: "/scenes/es7LZn2FUhvAPcq5",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000013",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 53.75,
          },
          color_temperature: {
            mirek: 153,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000019",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 53.75,
          },
          color_temperature: {
            mirek: 153,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.2439,
              y: 0.3791,
            },
          },
          dimming: {
            brightness: 30.43,
          },
        },
        {
          color: {
            xy: {
              x: 0.1654,
              y: 0.3959,
            },
          },
          dimming: {
            brightness: 30.43,
          },
        },
        {
          color: {
            xy: {
              x: 0.1829,
              y: 0.3021,
            },
          },
          dimming: {
            brightness: 30.43,
          },
        },
        {
          color: {
            xy: {
              x: 0.1559,
              y: 0.2699,
            },
          },
          dimming: {
            brightness: 30.43,
          },
        },
        {
          color: {
            xy: {
              x: 0.2004,
              y: 0.2469,
            },
          },
          dimming: {
            brightness: 30.43,
          },
        },
      ],
      dimming: [
        {
          brightness: 30.43,
        },
      ],
      color_temperature: [
        {
          color_temperature: {
            mirek: 154,
          },
          dimming: {
            brightness: 30.43,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Arctic aurora",
      image: {
        rid: "1e42b2e8-d02e-40d2-9c8d-b1fd8216c686",
        rtype: "public_image",
      },
      appdata: "vAPcq_r02_d17",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000038",
      rtype: "room",
    },
    speed: 0.6388888,
    auto_dynamic: false,
    status: {
      active: "inactive",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000062",
    id_v1: "/scenes/mzETgu9Nbp4HWjxC",
    actions: [],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 447,
          },
          dimming: {
            brightness: 56.13,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Relax",
      image: {
        rid: "a1f7da49-d181-4328-abea-68c9dc4b5416",
        rtype: "public_image",
      },
      appdata: "4HWjx_r03_d01",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000054",
      rtype: "room",
    },
    speed: 0.6031746,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-06T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000063",
    id_v1: "/scenes/t8Mao3GViwBQdr6K",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000027",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 447,
          },
          dimming: {
            brightness: 56.52,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Relax",
      image: {
        rid: "a1f7da49-d181-4328-abea-68c9dc4b5416",
        rtype: "public_image",
      },
      appdata: "BQdr6_r07_d01",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000052",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "static",
      last_recall: "2026-01-07T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000064",
    id_v1: "/scenes/2FUhvAPcq5JXkyDS",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 9.49,
          },
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 9.49,
          },
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 9.49,
          },
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 9.49,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 9.49,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 9.49,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 9.49,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
          dimming: {
            brightness: 0,
          },
        },
      ],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 500,
          },
          dimming: {
            brightness: 9.49,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Nightlight",
      image: {
        rid: "28bbfeff-1a0c-444e-bb4b-0b74b88e0c95",
        rtype: "public_image",
      },
      appdata: "JXkyD_r01_d07",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    speed: 0.6031746,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-08T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000065",
    id_v1: "/scenes/9Nbp4HWjxCRes7LZ",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000013",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 183,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000019",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 183,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.3433,
              y: 0.3545,
            },
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 183,
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Work",
      appdata: "Res7L_r02_d99",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000038",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-09T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000066",
    id_v1: "/scenes/GViwBQdr6KYmzETg",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 59.29,
          },
          color: {
            xy: {
              x: 0.5767,
              y: 0.2426,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 66.4,
          },
          color: {
            xy: {
              x: 0.6218,
              y: 0.3405,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 59.29,
          },
          color: {
            xy: {
              x: 0.2935,
              y: 0.1127,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 11.86,
          },
          color_temperature: {
            mirek: 345,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 11.86,
          },
          color_temperature: {
            mirek: 345,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 11.86,
          },
          color_temperature: {
            mirek: 345,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 11.86,
          },
          color_temperature: {
            mirek: 345,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.6218,
              y: 0.3405,
            },
          },
          dimming: {
            brightness: 66.4,
          },
        },
        {
          color: {
            xy: {
              x: 0.5727,
              y: 0.2508,
            },
          },
          dimming: {
            brightness: 59.29,
          },
        },
        {
          color: {
            xy: {
              x: 0.2924,
              y: 0.115,
            },
          },
          dimming: {
            brightness: 59.29,
          },
        },
      ],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 345,
          },
          dimming: {
            brightness: 11.86,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Gaming",
      appdata: "YmzET_r01_d99",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-10T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000067",
    id_v1: "/scenes/Pcq5JXkyDSft8Mao",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000013",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 99.21,
          },
          color_temperature: {
            mirek: 366,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000019",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 82.21,
          },
          color_temperature: {
            mirek: 453,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.4912,
              y: 0.4154,
            },
          },
          dimming: {
            brightness: 100,
          },
        },
        {
          color: {
            xy: {
              x: 0.472,
              y: 0.4131,
            },
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 453,
          },
          dimming: {
            brightness: 82.21,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Evening",
      appdata: "ft8Ma_r02_d99",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000038",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-11T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000068",
    id_v1: "/scenes/WjxCRes7LZn2FUhv",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000029",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.25,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000009",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.25,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000021",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.25,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000017",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.25,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 447,
          },
          dimming: {
            brightness: 56.25,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Relax",
      image: {
        rid: "a1f7da49-d181-4328-abea-68c9dc4b5416",
        rtype: "public_image",
      },
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000046",
      rtype: "room",
    },
    speed: 0.603,
    auto_dynamic: false,
    status: {
      active: "static",
      last_recall: "2026-01-12T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000069",
    id_v1: "/scenes/dr6KYmzETgu9Nbp4",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 56.52,
          },
          color_temperature: {
            mirek: 447,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 447,
          },
          dimming: {
            brightness: 56.52,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Relax",
      image: {
        rid: "a1f7da49-d181-4328-abea-68c9dc4b5416",
        rtype: "public_image",
      },
      appdata: "u9Nbp_r01_d01",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "static",
      last_recall: "2026-01-13T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000070",
    id_v1: "/scenes/kyDSft8Mao3GViwB",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 34.78,
          },
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 34.78,
          },
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 34.78,
          },
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 34.78,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 34.78,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 34.78,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 34.78,
          },
          color_temperature: {
            mirek: 500,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.561,
              y: 0.4042,
            },
          },
          dimming: {
            brightness: 34.78,
          },
        },
      ],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 500,
          },
          dimming: {
            brightness: 34.78,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Rest",
      image: {
        rid: "11a09ad5-8d65-4e90-959b-f05981a9ab1b",
        rtype: "public_image",
      },
      appdata: "3GViw_r01",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    speed: 0.6031746,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-14T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000071",
    id_v1: "/scenes/s7LZn2FUhvAPcq5J",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color: {
            xy: {
              x: 0.6737,
              y: 0.2997,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color: {
            xy: {
              x: 0.6737,
              y: 0.2997,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color: {
            xy: {
              x: 0.1938,
              y: 0.6821,
            },
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 454,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 454,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 454,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 454,
          },
        },
      },
    ],
    palette: {
      color: [
        {
          color: {
            xy: {
              x: 0.2161,
              y: 0.6654,
            },
          },
          dimming: {
            brightness: 79.05,
          },
        },
        {
          color: {
            xy: {
              x: 0.353,
              y: 0.5603,
            },
          },
          dimming: {
            brightness: 79.05,
          },
        },
        {
          color: {
            xy: {
              x: 0.4709,
              y: 0.4654,
            },
          },
          dimming: {
            brightness: 79.05,
          },
        },
        {
          color: {
            xy: {
              x: 0.569,
              y: 0.3797,
            },
          },
          dimming: {
            brightness: 79.05,
          },
        },
        {
          color: {
            xy: {
              x: 0.6737,
              y: 0.2997,
            },
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 454,
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Holiday",
      appdata: "APcq5_r01_d99",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "inactive",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000072",
    id_v1: "/scenes/zETgu9Nbp4HWjxCR",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 30.04,
          },
          color_temperature: {
            mirek: 367,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 30.04,
          },
          color_temperature: {
            mirek: 367,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 30.04,
          },
          color_temperature: {
            mirek: 367,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 30.04,
          },
          color_temperature: {
            mirek: 367,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 30.04,
          },
          color_temperature: {
            mirek: 367,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 30.04,
          },
          color_temperature: {
            mirek: 367,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 30.04,
          },
          color_temperature: {
            mirek: 367,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 367,
          },
          dimming: {
            brightness: 30.04,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Dimmed",
      image: {
        rid: "8c74b9ba-6e89-4083-a2a7-b10a1e566fed",
        rtype: "public_image",
      },
      appdata: "HWjxC_r01_d06",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000042",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-16T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000073",
    id_v1: "/scenes/8Mao3GViwBQdr6KY",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000003",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000025",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000031",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000001",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000005",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000023",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000015",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000007",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000011",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000009",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 233,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [
        {
          color_temperature: {
            mirek: 233,
          },
          dimming: {
            brightness: 100,
          },
        },
      ],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Concentrate",
      image: {
        rid: "b90c8900-a6b7-422c-a5d3-e170187dbf8c",
        rtype: "public_image",
      },
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000040",
      rtype: "zone",
    },
    speed: 0.603,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-17T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
  {
    id: "00000000-0000-4000-8000-000000000074",
    id_v1: "/scenes/FUhvAPcq5JXkyDSf",
    actions: [
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000013",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 156,
          },
        },
      },
      {
        target: {
          rid: "00000000-0000-4000-8000-000000000019",
          rtype: "light",
        },
        action: {
          on: {
            on: true,
          },
          dimming: {
            brightness: 100,
          },
          color_temperature: {
            mirek: 156,
          },
        },
      },
    ],
    palette: {
      color: [],
      dimming: [],
      color_temperature: [],
      effects: [],
      effects_v2: [],
    },
    recall: {},
    metadata: {
      name: "Energize",
      image: {
        rid: "7fd2ccc5-5749-4142-b7a5-66405a676f03",
        rtype: "public_image",
      },
      appdata: "XkyDS_r02_d04",
    },
    group: {
      rid: "00000000-0000-4000-8000-000000000038",
      rtype: "room",
    },
    speed: 0.5,
    auto_dynamic: false,
    status: {
      active: "inactive",
      last_recall: "2026-01-18T12:00:00.000Z",
    },
    last_actions_update: {
      source: "clip",
    },
    type: "scene",
  },
];

export const zigbeeConnectivity: ZigbeeConnectivity[] = [
  {
    id: "00000000-0000-4000-8000-000000000075",
    id_v1: "/lights/9",
    owner: {
      rid: "00000000-0000-4000-8000-000000000002",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:01",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000076",
    owner: {
      rid: "00000000-0000-4000-8000-000000000077",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:02",
    channel: {
      status: "set",
      value: "channel_25",
    },
    extended_pan_id: "0000000000000001",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000078",
    id_v1: "/lights/3",
    owner: {
      rid: "00000000-0000-4000-8000-000000000008",
      rtype: "device",
    },
    status: "connectivity_issue",
    mac_address: "00:17:88:01:00:00:00:03",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000079",
    id_v1: "/lights/1",
    owner: {
      rid: "00000000-0000-4000-8000-000000000024",
      rtype: "device",
    },
    status: "connectivity_issue",
    mac_address: "00:17:88:01:00:00:00:04",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000080",
    id_v1: "/lights/14",
    owner: {
      rid: "00000000-0000-4000-8000-000000000006",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:05",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000081",
    id_v1: "/lights/2",
    owner: {
      rid: "00000000-0000-4000-8000-000000000016",
      rtype: "device",
    },
    status: "connectivity_issue",
    mac_address: "00:17:88:01:00:00:00:06",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000082",
    id_v1: "/lights/12",
    owner: {
      rid: "00000000-0000-4000-8000-000000000012",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:07",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000083",
    id_v1: "/lights/17",
    owner: {
      rid: "00000000-0000-4000-8000-000000000032",
      rtype: "device",
    },
    status: "connectivity_issue",
    mac_address: "00:17:88:01:00:00:00:08",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000084",
    id_v1: "/lights/11",
    owner: {
      rid: "00000000-0000-4000-8000-000000000028",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:09",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000085",
    id_v1: "/sensors/2",
    owner: {
      rid: "00000000-0000-4000-8000-000000000086",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:10",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000087",
    id_v1: "/lights/16",
    owner: {
      rid: "00000000-0000-4000-8000-000000000026",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:11",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000088",
    id_v1: "/lights/5",
    owner: {
      rid: "00000000-0000-4000-8000-000000000030",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:12",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000089",
    id_v1: "/lights/15",
    owner: {
      rid: "00000000-0000-4000-8000-000000000004",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:13",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000090",
    id_v1: "/sensors/32",
    owner: {
      rid: "00000000-0000-4000-8000-000000000091",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:14",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000092",
    id_v1: "/lights/7",
    owner: {
      rid: "00000000-0000-4000-8000-000000000010",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:15",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000093",
    id_v1: "/lights/6",
    owner: {
      rid: "00000000-0000-4000-8000-000000000014",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:16",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000094",
    id_v1: "/lights/10",
    owner: {
      rid: "00000000-0000-4000-8000-000000000020",
      rtype: "device",
    },
    status: "connectivity_issue",
    mac_address: "00:17:88:01:00:00:00:17",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000095",
    id_v1: "/lights/4",
    owner: {
      rid: "00000000-0000-4000-8000-000000000018",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:18",
    type: "zigbee_connectivity",
  },
  {
    id: "00000000-0000-4000-8000-000000000096",
    id_v1: "/lights/13",
    owner: {
      rid: "00000000-0000-4000-8000-000000000022",
      rtype: "device",
    },
    status: "connected",
    mac_address: "00:17:88:01:00:00:00:19",
    type: "zigbee_connectivity",
  },
];
