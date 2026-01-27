```fortran
complex function cdotc (
        integer n,
        complex, dimension(*) cx,
        integer incx,
        complex, dimension(*) cy,
        integer incy
)
```

CDOTC forms the dot product of two complex vectors
CDOTC = X^H \* Y

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of CX

CY : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in]

INCY : INTEGER [in]
> storage spacing between elements of CY
