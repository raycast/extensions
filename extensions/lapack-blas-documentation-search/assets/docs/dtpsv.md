```fortran
subroutine dtpsv (
        character uplo,
        character trans,
        character diag,
        integer n,
        double precision, dimension(*) ap,
        double precision, dimension(*) x,
        integer incx
)
```

DTPSV  solves one of the systems of equations

A\*x = b,   or   A\*\*T\*x = b,

where b and x are n element vectors and A is an n by n unit, or
non-unit, upper or lower triangular matrix, supplied in packed form.

No test for singularity or near-singularity is included in this
routine. Such tests must be performed before calling this routine.

## Parameters
UPLO : CHARACTER\*1 [in]
> On entry, UPLO specifies whether the matrix is an upper or
> lower triangular matrix as follows:
> 
> UPLO = 'U' or 'u'   A is an upper triangular matrix.
> 
> UPLO = 'L' or 'l'   A is a lower triangular matrix.

TRANS : CHARACTER\*1 [in]
> On entry, TRANS specifies the equations to be solved as
> follows:
> 
> TRANS = 'N' or 'n'   A\*x = b.
> 
> TRANS = 'T' or 't'   A\*\*T\*x = b.
> 
> TRANS = 'C' or 'c'   A\*\*T\*x = b.

DIAG : CHARACTER\*1 [in]
> On entry, DIAG specifies whether or not A is unit
> triangular as follows:
> 
> DIAG = 'U' or 'u'   A is assumed to be unit triangular.
> 
> DIAG = 'N' or 'n'   A is not assumed to be unit
> triangular.

N : INTEGER [in]
> On entry, N specifies the order of the matrix A.
> N must be at least zero.

AP : DOUBLE PRECISION array, dimension at least [in]
> ( ( n\*( n + 1 ) )/2 ).
> Before entry with  UPLO = 'U' or 'u', the array AP must
> contain the upper triangular matrix packed sequentially,
> column by column, so that AP( 1 ) contains a( 1, 1 ),
> AP( 2 ) and AP( 3 ) contain a( 1, 2 ) and a( 2, 2 )
> respectively, and so on.
> Before entry with UPLO = 'L' or 'l', the array AP must
> contain the lower triangular matrix packed sequentially,
> column by column, so that AP( 1 ) contains a( 1, 1 ),
> AP( 2 ) and AP( 3 ) contain a( 2, 1 ) and a( 3, 1 )
> respectively, and so on.
> Note that when  DIAG = 'U' or 'u', the diagonal elements of
> A are not referenced, but are assumed to be unity.

X : DOUBLE PRECISION array, dimension at least [in,out]
> ( 1 + ( n - 1 )\*abs( INCX ) ).
> Before entry, the incremented array X must contain the n
> element right-hand side vector b. On exit, X is overwritten
> with the solution vector x.

INCX : INTEGER [in]
> On entry, INCX specifies the increment for the elements of
> X. INCX must not be zero.
