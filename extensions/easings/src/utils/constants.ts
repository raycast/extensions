import { springToCSSLinear } from "./spring-to-linear";

const BEZIER_VALUES = (type: string) => {
  switch (type) {
    case "easeInOutSine":
      return "0.445, 0.05, 0.55, 0.95";

    case "easeInOutQuad":
      return "0.455, 0.03, 0.515, 0.955";

    case "easeInOutCubic":
      return "0.645, 0.045, 0.355, 1";

    case "easeInOutQuart":
      return "0.77, 0, 0.175, 1";

    case "easeInOutCirc":
      return "0.785, 0.135, 0.15, 0.86";

    case "easeInOutQuint":
      return "0.86, 0, 0.07, 1";

    case "easeInOutExpo":
      return "1, 0, 0, 1";

    case "easeInOutBack":
      return "0.68, -0.55, 0.265, 1.55";

    case "easeInOutElastic":
      return "0.64, 0.57, 0.67, 1.53";

    case "easeInOutBounce":
      return "0.47, 1.64, 0.41, 0.8";

    case "easeInSine":
      return "0.47, 0, 0.745, 0.715);";

    case "easeInQuad":
      return "0.55, 0.085, 0.68, 0.53";

    case "easeInCubic":
      return "0.55, 0.055, 0.675, 0.19";

    case "easeInQuart":
      return "0.895, 0.03, 0.685, 0.22";

    case "easeInCirc":
      return "0.755, 0.05, 0.855, 0.06";

    case "easeInQuint":
      return "0.95, 0.05, 0.795, 0.035";

    case "easeInExpo":
      return "0.6, 0.04, 0.98, 0.335";

    case "easeInBack":
      return "0.6, -0.28, 0.735, 0.045";

    case "easeOutSine":
      return "0.39, 0.575, 0.565, 1";

    case "easeOutQuad":
      return "0.25, 0.46, 0.45, 0.94";

    case "easeOutCubic":
      return "0.215, 0.61, 0.355, 1";

    case "easeOutQuart":
      return "0.165, 0.84, 0.44, 1";

    case "easeOutCirc":
      return "0.23, 1, 0.32, 1";

    case "easeOutQuint":
      return "0.19, 1, 0.22, 1";

    case "easeOutExpo":
      return "0.075, 0.82, 0.165, 1";

    case "easeOutBack":
      return "0.175, 0.885, 0.32, 1.275";
  }
};

export const CSS = (type: string) => {
  return `cubic-bezier(${BEZIER_VALUES(type)});`;
};

export const FIGMA = (type: string) => {
  return `${BEZIER_VALUES(type)}`;
};

export const MOTION = (type: string) => {
  return type;
};

export const MOTION_CUSTOM = (type: string) => {
  return `cubicBezier(${BEZIER_VALUES(type)});`;
};

export const SPRING_PRESETS = {
  gentle: { stiffness: "100", damping: "10", mass: "1" },
  wobbly: { stiffness: "180", damping: "12", mass: "1" },
  stiff: { stiffness: "210", damping: "20", mass: "1" },
  slow: { stiffness: "280", damping: "60", mass: "1" },
  molasses: { stiffness: "170", damping: "26", mass: "1" },
  bouncy: { stiffness: "300", damping: "20", mass: "1" },
  default: { stiffness: "550", damping: "30", mass: "1.2" },
};

export const CUSTOM_CSS = (
  easing: string | { stiffness: string; damping: string; mass: string },
  type: string,
): string => {
  if (type === "spring") {
    if (typeof easing === "object") {
      return springToCSSLinear({
        stiffness: Number(easing.stiffness),
        damping: Number(easing.damping),
        mass: Number(easing.mass),
      });
    }
    return `linear(${easing});`;
  }
  return `cubic-bezier(${easing})`;
};

export const CUSTOM_FIGMA = (
  easing: string | { stiffness: string; damping: string; mass: string },
  type: string,
): string => {
  if (type === "spring") {
    if (typeof easing === "object") {
      return `mass: ${easing.mass}, stiffness: ${easing.stiffness}, damping: ${easing.damping}`;
    }
    return easing;
  }
  if (typeof easing === "string") {
    return easing.replace("stiffness", "s").replace("damping", "d").replace("mass", "m");
  }
  return JSON.stringify(easing);
};

export const CUSTOM_MOTION = (
  easing: string | { stiffness: string; damping: string; mass: string },
  type: string,
): string => {
  if (type === "spring") {
    if (typeof easing === "object") {
      return `mass: ${easing.mass}, stiffness: ${easing.stiffness}, damping: ${easing.damping}`;
    }
    return easing;
  }
  return `cubicBezier(${easing});`;
};
