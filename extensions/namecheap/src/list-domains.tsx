import { Icon, Image, List } from "@raycast/api";
import { useListDomains } from "./namecheap";
import { getFavicon } from "@raycast/utils";

export default function ListDomains() {
    const { isLoading, data: domains } = useListDomains();

    return <List isLoading={isLoading}>
        {domains.map(domain => {
            const accessories: List.Item.Accessory[] = [];
            if (domain.WhoisGuard==="ENABLED" )accessories.push({icon: {source: Icon.ExclamationMark, mask: Image.Mask.Circle}, tooltip: " Domain Privacy protection is ON"});
            return <List.Item key={domain.ID} icon={getFavicon(`https://${domain.Name}`, { fallback: Icon.Globe })} title={domain.Name} accessories={accessories} />;
        })}
    </List>
}