import { PushAction, PushActionProps } from "@raycast/api";
import { useAtom } from "jotai";
import { maxNumAtom, readStatusAtom } from "./atoms";
import ComicPage from "./comic";
export const OpenComic = ({
  num,
  ...props
}: {
  num: number;
} & Partial<PushActionProps>) => {
  return (
    <PushAction
      title={`Open Comic #${num}`}
      icon={{ source: { light: "book-open.png", dark: "book-open@dark.png" } }}
      target={<ComicPage num={num} />}
      {...props}
    />
  );
};
export default OpenComic;

export const OpenRandomComic = (props: Partial<PushActionProps>) => {
  const [maxNum] = useAtom(maxNumAtom);
  const num = Math.floor(Math.random() * maxNum + 1);
  return (
    <PushAction
      title={`Open a Random Comic`}
      icon={{ source: { light: "refresh-cw.png", dark: "refresh-cw@dark.png" } }}
      target={<ComicPage num={num} />}
      {...props}
    />
  );
};

export const OpenRandomUnreadComic = (props: Partial<PushActionProps>) => {
  const [maxNum] = useAtom(maxNumAtom);
  const [readStatus] = useAtom(readStatusAtom);
  const unRead = [];
  for (let i = 1; i <= maxNum; i++) {
    if (!readStatus[i]) {
      unRead.push(i);
    }
  }
  const num = unRead[Math.floor(Math.random() * unRead.length)];
  return (
    <PushAction
      title={`Open a Random Unread Comic`}
      icon={{ source: { light: "shuffle.png", dark: "shuffle@dark.png" } }}
      target={<ComicPage num={num} />}
      {...props}
    />
  );
};
