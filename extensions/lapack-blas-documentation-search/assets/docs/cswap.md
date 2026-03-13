```fortran
subroutine cswap (
        integer n,
        complex, dimension(*) cx,
        integer incx,
        complex, dimension(*) cy,
        integer incy
)
```

CSWAP interchanges two vectors.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of CX

CY : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of CY
