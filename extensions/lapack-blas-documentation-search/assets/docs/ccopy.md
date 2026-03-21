```fortran
subroutine ccopy (
        integer n,
        complex, dimension(*) cx,
        integer incx,
        complex, dimension(*) cy,
        integer incy
)
```

CCOPY copies a vector x to a vector y.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of CX

CY : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [out]

INCY : INTEGER [in]
> storage spacing between elements of CY
