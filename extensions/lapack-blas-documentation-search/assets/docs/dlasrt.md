```fortran
subroutine dlasrt (
        character id,
        integer n,
        double precision, dimension( * ) d,
        integer info
)
```

Sort the numbers in D in increasing order (if ID = 'I') or
in decreasing order (if ID = 'D' ).

Use Quick Sort, reverting to Insertion sort on arrays of
size <= 20. Dimension of STACK limits N to about 2\*\*32.

## Parameters
ID : CHARACTER\*1 [in]
> = 'I': sort D in increasing order;
> = 'D': sort D in decreasing order.

N : INTEGER [in]
> The length of the array D.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the array to be sorted.
> On exit, D has been sorted into increasing order
> (D(1) <= ... <= D(N) ) or into decreasing order
> (D(1) >= ... >= D(N) ), depending on ID.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
