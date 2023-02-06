import findUrlInt from "./findUrlInt";

const parseIntroducedBy = (url: string) => `!${findUrlInt(url)}`;

export default parseIntroducedBy;
