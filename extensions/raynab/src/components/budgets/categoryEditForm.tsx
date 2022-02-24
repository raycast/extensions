import { Category, CurrencyFormat } from '@srcTypes';
import { formatToReadablePrice, formatToYnabPrice, isNumber } from '@lib/utils';
import { ActionPanel, Action, Form, Icon, Color, showToast, Toast, confirmAlert } from '@raycast/api';
import { updateCategory } from '@lib/api';
import { useLocalStorage } from '@hooks/useLocalStorage';

interface Values {
  budgeted: string;
}

export function CategoryEditForm({ category }: { category: Category }) {
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  const currencySymbol = activeBudgetCurrency?.currency_symbol;

  async function handleSubmit(values: Values) {
    if (!isValidFormSubmission(values)) return;

    const submittedValues = { budgeted: formatToYnabPrice(values.budgeted) };

    if (submittedValues.budgeted === category.budgeted) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Same budgeted amount',
        message: 'Updated budget is the same as the current budget. Please enter a different value.',
      });
      return;
    }

    if (
      await confirmAlert({
        title: `Are you sure you want to update ${category.name}?`,
        message: `Change from ${formatToReadablePrice(category.budgeted)} to ${values.budgeted}`,
        icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      })
    ) {
      const toast = await showToast({ style: Toast.Style.Animated, title: 'Updating Category' });

      updateCategory(activeBudgetId || 'last-used', category.id, submittedValues).then(() => {
        toast.style = Toast.Style.Success;
        toast.title = 'Category updated successfully';
      });
    }
  }

  return (
    <Form
      navigationTitle="Edit Category"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Edit Category" text={`Edit the budgeted amount for ${category.name}`} />
      <Form.TextField
        id="budgeted"
        title={`Budgeted Amount ${currencySymbol ? `(${currencySymbol})` : ''}`}
        defaultValue={formatToReadablePrice(category.budgeted)}
      />
    </Form>
  );
}

function isValidFormSubmission(values: Values) {
  let isValid = true;

  if (!isNumber(values.budgeted)) {
    isValid = false;
    showToast({
      style: Toast.Style.Failure,
      title: `Incorrect value for the budgeted amount.`,
      message: `${values.budgeted} is not a valid number`,
    });
  }

  return isValid;
}
