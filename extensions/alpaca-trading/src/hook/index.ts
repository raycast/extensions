import { Alert, Color, confirmAlert, environment, getPreferenceValues, Icon } from '@raycast/api';
import { FormValidation, useFetch, useForm } from '@raycast/utils';

import { AlpacaApi } from '@/api';

export namespace AlpacaHook {
  const { apiKey, apiSecret, accountType } = getPreferenceValues<Preferences>();
  const endpoint = `https://${accountType === 'paper' ? 'paper-api' : 'api'}.alpaca.markets/v2`;
  const { extensionName, commandName } = environment;
  const headers = { 'APCA-API-KEY-ID': apiKey, 'APCA-API-SECRET-KEY': apiSecret, Accept: 'application/json', 'User-Agent': `raycast/ext/${extensionName}/${commandName}` };

  export namespace Orders {
    export const useListOrders = (orderStatus: string) => {
      const { isLoading, data, revalidate, pagination, error } = useFetch(`${endpoint}/orders?status=${orderStatus}`, { headers, method: 'GET', initialData: [] });
      const orders = data as AlpacaApi.Orders.Schema[];
      return { isLoading, orders, revalidate, pagination, error };
    };
  }

  export namespace Positions {
    export interface ClosePositionFormValues {
      quantity: string;
      percentage: string;
      kind: string;
    }

    export interface UseClosePositionFormProps {
      position: AlpacaApi.Positions.Schema;
      pop: () => void;
      revalidate: () => void;
    }

    export const useListPositions = () => {
      const { isLoading, data, revalidate, pagination, error } = useFetch(`${endpoint}/positions`, { headers, method: 'GET', initialData: [] });
      const positions = data as AlpacaApi.Positions.Schema[];
      return { isLoading, positions, revalidate, pagination, error };
    };

    export const useClosePositionForm = ({ position, revalidate, pop }: UseClosePositionFormProps) => {
      const { handleSubmit, itemProps, values } = useForm<ClosePositionFormValues>({
        onSubmit: values =>
          confirmAlert({
            title: 'Are you sure?',
            message: {
              all: `Closing entire ${position.qty_available} quantities for ${position.symbol} position`,
              qty: `Closing ${values.quantity} quantities for ${position.symbol} position`,
              pc: `Closing ${values.percentage} % for ${position.symbol} position`,
            }[values.kind],
            icon: { source: Icon.TackDisabled, tintColor: Color.Red },
            primaryAction: {
              title: 'Yes',
              style: Alert.ActionStyle.Destructive,
              onAction: () =>
                AlpacaApi.Positions.closePosition(position, { qty: `?qty=${values.quantity}`, pc: `?percentage=${values.percentage}` }[values.kind]).finally(() => {
                  pop();
                  setTimeout(revalidate, 1000);
                }),
            },
            dismissAction: { title: 'No', style: Alert.ActionStyle.Cancel },
          }),
        initialValues: { kind: 'all' },
        validation: {
          kind: FormValidation.Required,
          quantity: value => {
            if (values.kind === 'qty' && Number.isNaN(Number(value)) && value!.split('.')[1]?.length > 9) {
              return 'quantity should be a number with at most 9 decimal places';
            }
          },
          percentage: value => {
            if (values.kind === 'pc' && Number.isNaN(Number(value)) && value!.split('.')[1]?.length > 9 && (Number(value) < 0 || Number(value) > 100)) {
              return 'percentage should be a number between 0 to 100 with at most 9 decimal places';
            }
          },
        },
      });
      return { handleSubmit, itemProps, values };
    };
  }
}
