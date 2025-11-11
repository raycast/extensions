```fortran
complex function cdotu (
        integer n,
        complex, dimension(*) cx,
        integer incx,
        complex, dimension(*) cy,
        integer incy
)
```

CDOTU forms the dot product of two complex vectors
CDOTU = X^T \* Y

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of CX

CY : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in]

INCY : INTEGER [in]
> storage spacing between elements of CY
