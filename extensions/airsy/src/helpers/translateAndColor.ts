const translateAndColor = (v: string | undefined) => {
  switch (v) {
    case "Bardzo dobry":
      return { color: "green", text: "Very Good" };
    case "Dobry":
      return { color: "blue", text: "Good" };
    case "Umiarkowany":
      return { color: "yellow", text: "Moderate" };
    case "Dostateczny":
      return { color: "orange", text: "Sufficient" };
    case "Zły":
      return { color: "red", text: "Bad" };
    default:
      return { color: "grey", text: "Unknown" };
  }
};

export default translateAndColor;
