```fortran
subroutine dscal (
        integer n,
        double precision da,
        double precision, dimension(*) dx,
        integer incx
)
```

DSCAL scales a vector by a constant.
uses unrolled loops for increment equal to 1.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DA : DOUBLE PRECISION [in]
> On entry, DA specifies the scalar alpha.

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of DX
