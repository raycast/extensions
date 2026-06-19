import { List } from "@raycast/api";
import { type IImgInfo } from "picgo";

type Props = {
    result: IImgInfo[];
};

export default function ImagesMetadataPanel({ result }: Props) {
    if (result.length === 1)
        return (
            <List.Item.Detail.Metadata>
                {Object.keys(result[0]).map((k) => (
                    <List.Item.Detail.Metadata.Label key={`img.${k}`} title={k} text={result[0][k] ?? ""} />
                ))}
            </List.Item.Detail.Metadata>
        );
    return (
        <List.Item.Detail.Metadata>
            {result.map((r, i) => {
                const labels = [<List.Item.Detail.Metadata.Label key={`img[${i}]`} title={`Image ${i + 1}`} />];
                if (i !== 0) labels.unshift(<List.Item.Detail.Metadata.Separator key={`separator[${i}]`} />);
                labels.push(
                    ...Object.keys(r).map((k) => (
                        <List.Item.Detail.Metadata.Label key={`img[${i}].${k}`} title={k} text={r[k] ?? ""} />
                    )),
                );
                return labels;
            })}
        </List.Item.Detail.Metadata>
    );
}
