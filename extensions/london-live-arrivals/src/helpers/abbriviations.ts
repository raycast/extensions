export const ABBREVIATIONS: { [key: string]: string } = {
    "Station": "Stn",
    "Railway": "Rly",
    "Rail": "Rly",
    "Square": "Sq",
    "Broadway": "Bwy",
    "Avenue": "Ave",
    "Boulevard": "Blvd",
    "Street": "St",
    "Road": "Rd",
    "Lane": "Ln",
    "Gardens": "Gdns",
    "Crescent": "Cres",
    "Drive": "Dr",
    "Highway": "Hwy",
    "Terrace": "Ter",
    "Court": "Ct",
    "Place": "Pl",
    "Junction": "Junc",
    "End": "End", // Sometimes you may just keep it as it is
    "Market": "Mkt",
    "Bridge": "Br",
  };
  
  export const abbreviateName = (name: string): string => {
    const words = name.split(" ");
    const abbreviatedWords = words.map(word => ABBREVIATIONS[word] || word);
    let abbreviatedName = abbreviatedWords.join(" ");
  
    // Truncate if the name is longer than 10 characters
    if (abbreviatedName.length > 16) {
      abbreviatedName = abbreviatedName.substring(0, 13) + "...";
    }
  
    return abbreviatedName;
  };