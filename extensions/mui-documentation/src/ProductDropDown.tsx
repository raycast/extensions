import { List } from '@raycast/api';

import { DropdownOptions, ProductDropDownProps } from './types';

const products: { id: DropdownOptions; title: string }[] = [
  { id: 'preferences', title: 'Preference Settings' },
  { id: 'all', title: 'All Libraries' },
  { id: 'material-ui', title: 'Material UI' },
  { id: 'joy-ui', title: 'Joy UI' },
  { id: 'base', title: 'Base UI' },
  { id: 'mui-x', title: 'MUI X' },
  { id: 'system', title: 'MUI System' },
];

const ProductDropDown = ({ onChange }: ProductDropDownProps) => {
  return (
    <List.Dropdown
      defaultValue="preferences"
      onChange={onChange}
      tooltip="Search Filter"
    >
      <List.Dropdown.Section title="Search Filter">
        {products.map(({ id, title }) => (
          <List.Dropdown.Item key={id} title={title} value={id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default ProductDropDown;
