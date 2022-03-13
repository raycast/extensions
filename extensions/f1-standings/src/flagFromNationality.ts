const flagFromNationality = (nationality: string) => {
  switch (nationality) {
    case "American":
      return "🇺🇸";
    case "Argentine":
      return "🇦🇷";
    case "Australian":
      return "🇦🇺";
    case "Austrian":
      return "🇦🇹";
    case "Belgian":
      return "🇧🇪";
    case "Brazilian":
      return "🇧🇷";
    case "British":
      return "🇬🇧";
    case "Canadian":
      return "🇨🇦";
    case "Chilean":
      return "🇨🇱";
    case "Chinese":
      return "🇨🇳";
    case "Colombian":
      return "🇨🇴";
    case "Czech":
      return "🇨🇿";
    case "Danish":
      return "🇩🇰";
    case "Dutch":
      return "🇳🇱";
    case "Finnish":
      return "🇫🇮";
    case "French":
      return "🇫🇷";
    case "German":
      return "🇩🇪";
    case "Hungarian":
      return "🇭🇺";
    case "Hong Kong":
      return "🇭🇰";
    case "Indian":
      return "🇮🇳";
    case "Indonesian":
      return "🇮🇩";
    case "Irish":
      return "🇮🇪";
    case "Italian":
      return "🇮🇹";
    case "Japanese":
      return "🇯🇵";
    case "Liechtensteiner":
      return "🇱🇮";
    case "Malaysian":
      return "🇲🇾";
    case "Mexican":
      return "🇲🇽";
    case "Monegasque":
      return "🇲🇨";
    case "New Zealand":
    case "New Zealander":
      return "🇳🇿";
    case "Polish":
      return "🇵🇱";
    case "Portuguese":
      return "🇵🇹";
    case "Russian":
      return "🇷🇺";
    case "South African":
      return "🇿🇦";
    case "Spanish":
      return "🇪🇸";
    case "Swedish":
      return "🇸🇪";
    case "Swiss":
      return "🇨🇭";
    case "Thai":
      return "🇹🇭";
    case "Venezuelan":
      return "🇻🇪";

    // there is no emoji for Rhodesia
    case "Rhodesian":
    default:
      return "";
  }
};

export default flagFromNationality;
