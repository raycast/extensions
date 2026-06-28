```fortran
subroutine sscal (
        integer n,
        real sa,
        real, dimension(*) sx,
        integer incx
)
```

SSCAL scales a vector by a constant.
uses unrolled loops for increment equal to 1.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SA : REAL [in]
> On entry, SA specifies the scalar alpha.

SX : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of SX
