import { open } from '@raycast/api';

export default async function main() {
  // Open a new issue on my own repo to make use of the template
  const search = new URLSearchParams({
    title: 'Unexpected format result from ...',
    template: 'unexpected_format_result.yml',
  });
  open(`https://github.com/EnixCoda/NaturalSpace/issues/new?${search}`);
}
