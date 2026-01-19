```fortran
subroutine dswap (
        integer n,
        double precision, dimension(*) dx,
        integer incx,
        double precision, dimension(*) dy,
        integer incy
)
```

DSWAP interchanges two vectors.
uses unrolled loops for increments equal to 1.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of DX

DY : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of DY
