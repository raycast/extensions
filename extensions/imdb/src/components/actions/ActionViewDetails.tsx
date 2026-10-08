import { Action, Icon } from '@raycast/api';
import ItemDetail from '../ItemDetail';
import { DetailedItem } from '../../data/fetchDetails';

type Props = {
  item: DetailedItem;
};

const ActionViewDetails = ({ item }: Props) => (
  <Action.Push
    title="View Details"
    target={<ItemDetail item={item} />}
    icon={Icon.AppWindowSidebarRight}
  />
);

export default ActionViewDetails;
