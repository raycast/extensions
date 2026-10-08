```fortran
subroutine csscal (
        integer n,
        real sa,
        complex, dimension(*) cx,
        integer incx
)
```

CSSCAL scales a complex vector by a real constant.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SA : REAL [in]
> On entry, SA specifies the scalar alpha.

CX : COMPLEX array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of CX
