import type { FC } from "react";

interface Props {
  name: string;
}

export const Document: FC<Props> = ({ name }) => {
  return <div>Document</div>;
};
