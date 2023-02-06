import findUrlInt from "./findUrlInt";

const parseRollout = (url: string) => `#${findUrlInt(url)}`;

export default parseRollout;
