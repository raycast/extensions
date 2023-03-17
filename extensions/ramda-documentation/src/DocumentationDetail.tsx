import { Detail } from '@raycast/api';

import type { RamdaFunction } from '../@types';
import { CommonActionPanel } from './CommonActionPanel';

type DocumentationDetailProps = {
  data: RamdaFunction;
};

export const DocumentationDetail = ({ data }: DocumentationDetailProps) => {
  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Version" text={data.addedInVersion} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="See in docs" target={data.href} text={data.functionName} />
    </Detail.Metadata>
  );

  const markdown = `
  ## ${data.functionName}
  
  ${data.description}
  
  ### Code Example
  
  \`\`\` js
  ${data.codeExample}
  \`\`\`
  
  ${data.seeAlso || ''}
  `;

  return (
    <Detail
      actions={<CommonActionPanel data={data} />}
      metadata={metadata}
      navigationTitle={data.functionName}
      markdown={markdown}
    />
  );
};
