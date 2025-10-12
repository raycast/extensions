```fortran
subroutine daxpy (
        integer n,
        double precision da,
        double precision, dimension(*) dx,
        integer incx,
        double precision, dimension(*) dy,
        integer incy
)
```

DAXPY constant times a vector plus a vector.
uses unrolled loops for increments equal to one.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DA : DOUBLE PRECISION [in]
> On entry, DA specifies the scalar alpha.

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of DX

DY : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of DY
