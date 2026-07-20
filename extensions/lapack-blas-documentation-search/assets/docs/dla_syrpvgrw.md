```fortran
double precision function dla_syrpvgrw (
        character*1 uplo,
        integer n,
        integer info,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        double precision, dimension( * ) work
)
```

DLA_SYRPVGRW computes the reciprocal pivot growth factor
norm(A)/norm(U). The  norm is used. If this is
much less than 1, the stability of the LU factorization of the
(equilibrated) matrix A could be poor. This also means that the
solution X, estimated condition numbers, and error bounds could be
unreliable.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

INFO : INTEGER [in]
> The value of INFO returned from DSYTRF, .i.e., the pivot in
> column INFO is exactly 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : DOUBLE PRECISION array, dimension (LDAF,N) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by DSYTRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by DSYTRF.

WORK : DOUBLE PRECISION array, dimension (2\*N) [out]
