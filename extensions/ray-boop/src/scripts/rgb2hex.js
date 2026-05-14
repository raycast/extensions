/**
  {
    "api":1,
    "name":"RGB to Hex",
    "description":"Convert color in RGB to hexadecimal",
    "author":"luisfontes19",
    "icon":"color-wheel",
    "tags":"rgb,hex,convert,color"
  }
**/

export function main(state) {
  let rgb = state.text.trim();

  // Handle rgb(255,87,51) format by removing rgb( and )
  if (rgb.toLowerCase().startsWith("rgb(") && rgb.endsWith(")")) {
    rgb = rgb.slice(4, -1); // Remove 'rgb(' and ')'
  }

  const rgbArray = rgb.includes(",") ? rgb.split(",") : rgb.split(" ");

  if (rgbArray.length !== 3) return state.postError("Invalid RGB format");

  let hex = "#";

  try {
    rgbArray.forEach((c) => {
      const value = parseInt(c.trim());
      if (value < 0 || value > 255) {
        throw new Error("RGB values must be between 0 and 255");
      }
      const hexValue = value.toString(16).padStart(2, "0");
      hex += hexValue;
    });
  } catch (error) {
    return state.postError("Invalid RGB value: " + error.message);
  }

  state.text = hex.toUpperCase();
}
