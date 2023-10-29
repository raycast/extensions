type ValueOf<T> = T[keyof T];

type Override<T, U> = Omit<T, keyof U> & U;
