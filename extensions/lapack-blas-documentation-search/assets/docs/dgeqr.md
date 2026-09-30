```fortran
subroutine dgeqr (
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) t,
        integer tsize,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DGEQR computes a QR factorization of a real M-by-N matrix A:

A = Q \* ( R ),
( 0 )

where:

Q is a M-by-M orthogonal matrix;
R is an upper-triangular N-by-N matrix;
0 is a (M-N)-by-N zero matrix, if M > N.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, the elements on and above the diagonal of the array
> contain the min(M,N)-by-N upper trapezoidal matrix R
> (R is upper triangular if M >= N);
> the elements below the diagonal are used to store part of the
> data structure to represent Q.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

T : DOUBLE PRECISION array, dimension (MAX(5,TSIZE)) [out]
> On exit, if INFO = 0, T(1) returns optimal (or either minimal
> or optimal, if query is assumed) TSIZE. See TSIZE for details.
> Remaining T contains part of the data structure used to represent Q.
> If one wants to apply or construct Q, then one needs to keep T
> (in addition to A) and pass it to further subroutines.

TSIZE : INTEGER [in]
> If TSIZE >= 5, the dimension of the array T.
> If TSIZE = -1 or -2, then a workspace query is assumed. The routine
> only calculates the sizes of the T and WORK arrays, returns these
> values as the first entries of the T and WORK arrays, and no error
> message related to T or WORK is issued by XERBLA.
> If TSIZE = -1, the routine calculates optimal size of T for the
> optimum performance and returns this value in T(1).
> If TSIZE = -2, the routine calculates minimal size of T and
> returns this value in T(1).

WORK : (workspace) DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) contains optimal (or either minimal
> or optimal, if query was assumed) LWORK.
> See LWORK for details.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= 1.
> If LWORK = -1 or -2, then a workspace query is assumed. The routine
> only calculates the sizes of the T and WORK arrays, returns these
> values as the first entries of the T and WORK arrays, and no error
> message related to T or WORK is issued by XERBLA.
> If LWORK = -1, the routine calculates optimal size of WORK for the
> optimal performance and returns this value in WORK(1).
> If LWORK = -2, the routine calculates minimal size of WORK and
> returns this value in WORK(1).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
