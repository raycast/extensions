```fortran
subroutine dcopy (
        integer n,
        double precision, dimension(*) dx,
        integer incx,
        double precision, dimension(*) dy,
        integer incy
)
```

DCOPY copies a vector, x, to a vector, y.
uses unrolled loops for increments equal to 1.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of DX

DY : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [out]

INCY : INTEGER [in]
> storage spacing between elements of DY
