const getFlag = (nationalityOrCountry: string) => {
  switch (nationalityOrCountry) {
    case "USA":
    case "United States":
    case "American":
      return "🇺🇸";
    case "Argentina":
    case "Argentine":
      return "🇦🇷";
    case "Australia":
    case "Australian":
      return "🇦🇺";
    case "Austria":
    case "Austrian":
      return "🇦🇹";
    case "Azerbaijan":
      return "🇦🇿";
    case "Bahrain":
      return "🇧🇭";
    case "Belgium":
    case "Belgian":
      return "🇧🇪";
    case "Brazil":
    case "Brazilian":
      return "🇧🇷";
    case "UK":
    case "British":
      return "🇬🇧";
    case "Canada":
    case "Canadian":
      return "🇨🇦";
    case "Chilean":
      return "🇨🇱";
    case "China":
    case "Chinese":
      return "🇨🇳";
    case "Colombian":
      return "🇨🇴";
    case "Czech":
      return "🇨🇿";
    case "Danish":
      return "🇩🇰";
    case "Netherlands":
    case "Dutch":
      return "🇳🇱";
    case "Finnish":
      return "🇫🇮";
    case "France":
    case "French":
      return "🇫🇷";
    case "Germany":
    case "German":
      return "🇩🇪";
    case "Hungary":
    case "Hungarian":
      return "🇭🇺";
    case "Hong Kong":
      return "🇭🇰";
    case "India":
    case "Indian":
      return "🇮🇳";
    case "Indonesian":
      return "🇮🇩";
    case "Irish":
      return "🇮🇪";
    case "Italy":
    case "Italian":
      return "🇮🇹";
    case "Japan":
    case "Japanese":
      return "🇯🇵";
    // South Korea
    case "Korea":
      return "🇰🇷";
    case "Liechtensteiner":
      return "🇱🇮";
    case "Malaysia":
    case "Malaysian":
      return "🇲🇾";
    case "Mexico":
    case "Mexican":
      return "🇲🇽";
    case "Monaco":
    case "Monegasque":
      return "🇲🇨";
    case "Morocco":
      return "🇲🇦";
    case "New Zealand":
    case "New Zealander":
      return "🇳🇿";
    case "Polish":
      return "🇵🇱";
    case "Portugal":
    case "Portuguese":
      return "🇵🇹";
    case "Qatar":
      return "🇶🇦";
    case "Russia":
    case "Russian":
      return "🇷🇺";
    case "Singapore":
      return "🇸🇬";
    case "Saudi Arabia":
      return "🇸🇦";
    case "South Africa":
    case "South African":
      return "🇿🇦";
    case "Spain":
    case "Spanish":
      return "🇪🇸";
    case "Sweden":
    case "Swedish":
      return "🇸🇪";
    case "Switzerland":
    case "Swiss":
      return "🇨🇭";
    case "Thai":
      return "🇹🇭";
    case "Turkey":
    case "Turkish":
      return "🇹🇷";
    case "UAE":
      return "🇦🇪";
    case "Venezuelan":
      return "🇻🇪";

    // there is no emoji for Rhodesia
    case "Rhodesian":
    default:
      return "";
  }
};

export default getFlag;
