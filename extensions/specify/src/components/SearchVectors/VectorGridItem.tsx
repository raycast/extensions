import { ActionPanel, Grid, Action, Icon, showToast, Toast, showHUD } from '@raycast/api';
import { useAsync } from 'react-use';
import { Vector } from '../../types/tokens.types';
import { copyVector, getDisplayablePDF, getDisplayableSVG } from '../../utils/assets.utils';

interface VectorGridItemProps {
  vector: Vector;
  namespace: string;
  repositoryName: string;
  page: number;
  maxPage: number;
  handleGoNextPage: () => void;
  handleGoPreviousPage: () => void;
  handleGoToFirstPage: () => void;
}

export default ({
  vector,
  namespace,
  repositoryName,
  page,
  maxPage,
  handleGoNextPage,
  handleGoPreviousPage,
  handleGoToFirstPage,
}: VectorGridItemProps) => {
  const handleCopy = async () => {
    const toast = await showToast(Toast.Style.Animated, 'Getting your vector...');
    await copyVector(vector.value.url, vector.value.format, vector.name);
    await toast.hide();
    await showHUD('Vector copied to clipboard as SVG');
  };

  const getDisplayableVector = async () => {
    const sourceFile = await (vector.value.format === 'svg'
      ? getDisplayableSVG(vector.name, vector.value.url)
      : getDisplayablePDF());

    if (!vector.sourceFile) {
      vector.sourceFile = sourceFile;
      return sourceFile;
    }

    return sourceFile;
  };

  // Forces to rerender when we have the vector stored in fs
  const { value: source } = useAsync(getDisplayableVector, [vector.sourceFile]);

  return (
    <Grid.Item
      key={vector.id}
      title={vector.name}
      content={{ source: source ?? '', fallback: Icon.QuestionMark }}
      subtitle={`${vector.value.format.toUpperCase()}`}
      actions={
        <ActionPanel>
          {vector.value.format === 'svg' ? (
            <Action icon={Icon.Clipboard} title="Copy as SVG" onAction={handleCopy} />
          ) : (
            <Action.OpenInBrowser
              title="Learn more"
              url={`https://help.specifyapp.com/en/articles/6321713-how-the-raycast-extension-works`}
            />
          )}
          {page !== maxPage && <Action icon={Icon.ChevronDown} title="Next Page" onAction={handleGoNextPage} />}
          {page !== 0 && <Action icon={Icon.ChevronUp} title="Previous Page" onAction={handleGoPreviousPage} />}
          {page !== 0 && (
            <Action icon={Icon.ArrowRight} title="Back to the First Page" onAction={handleGoToFirstPage} />
          )}
          <Action.OpenInBrowser
            title="Go to Repository"
            url={`https://specifyapp.com/${namespace}/${repositoryName}/vector`}
          />
        </ActionPanel>
      }
    />
  );
};
