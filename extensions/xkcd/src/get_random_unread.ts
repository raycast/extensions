import { Status } from "./atoms";

const getRandomUnread = (readStatus: Status, maxNum: number) => {
  const unread = [];
  for (let i = 1; i <= maxNum; i++) {
    if (!readStatus[i]) {
      unread.push(i);
    }
  }
  return unread[Math.floor(Math.random() * unread.length)];
};
export default getRandomUnread;
