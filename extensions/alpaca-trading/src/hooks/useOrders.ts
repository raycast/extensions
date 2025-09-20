import { endpoint, headers } from '@api/fetch';
import { Order } from '@api/orders';
import { useFetch } from '@raycast/utils';

export const useOrders = (orderStatus: string) => {
  const { isLoading, data, revalidate, error } = useFetch(`${endpoint}/orders?status=${orderStatus}`, { headers, method: 'GET', initialData: [] });
  const orders = data as Order[];

  return {
    isLoading: (!data && !error) || isLoading,
    orders,
    revalidate,
    error,
  };
};
