```fortran
real(wp) function snrm2 (
        integer n,
        real(wp), dimension(*) x,
        integer incx
)
```

SNRM2 returns the euclidean norm of a vector via the function
name, so that

SNRM2 := sqrt( x'\*x ).

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

X : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER, storage spacing between elements of X [in]
> If INCX > 0, X(1+(i-1)\*INCX) = x(i) for 1 <= i <= n
> If INCX < 0, X(1-(n-i)\*INCX) = x(i) for 1 <= i <= n
> If INCX = 0, x isn't a vector so there is no need to call
> this subroutine.  If you call it anyway, it will count x(1)
> in the vector norm N times.
