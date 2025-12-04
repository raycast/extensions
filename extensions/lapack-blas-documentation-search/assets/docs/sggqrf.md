```fortran
subroutine sggqrf (
        integer n,
        integer m,
        integer p,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) taua,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) taub,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SGGQRF computes a generalized QR factorization of an N-by-M matrix A
and an N-by-P matrix B:

A = Q\*R,        B = Q\*T\*Z,

where Q is an N-by-N orthogonal matrix, Z is a P-by-P orthogonal
matrix, and R and T assume one of the forms:

if N >= M,  R = ( R11 ) M  ,   or if N < M,  R = ( R11  R12 ) N,
(  0  ) N-M                         N   M-N
M

where R11 is upper triangular, and

if N <= P,  T = ( 0  T12 ) N,   or if N > P,  T = ( T11 ) N-P,
P-N  N                           ( T21 ) P
P

where T12 or T21 is upper triangular.

In particular, if B is square and nonsingular, the GQR factorization
of A and B implicitly gives the QR factorization of inv(B)\*A:

inv(B)\*A = Z\*\*T\*(inv(T)\*R)

where inv(B) denotes the inverse of the matrix B, and Z\*\*T denotes the
transpose of the matrix Z.

## Parameters
N : INTEGER [in]
> The number of rows of the matrices A and B. N >= 0.

M : INTEGER [in]
> The number of columns of the matrix A.  M >= 0.

P : INTEGER [in]
> The number of columns of the matrix B.  P >= 0.

A : REAL array, dimension (LDA,M) [in,out]
> On entry, the N-by-M matrix A.
> On exit, the elements on and above the diagonal of the array
> contain the min(N,M)-by-M upper trapezoidal matrix R (R is
> upper triangular if N >= M); the elements below the diagonal,
> with the array TAUA, represent the orthogonal matrix Q as a
> product of min(N,M) elementary reflectors (see Further
> Details).

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

TAUA : REAL array, dimension (min(N,M)) [out]
> The scalar factors of the elementary reflectors which
> represent the orthogonal matrix Q (see Further Details).

B : REAL array, dimension (LDB,P) [in,out]
> On entry, the N-by-P matrix B.
> On exit, if N <= P, the upper triangle of the subarray
> B(1:N,P-N+1:P) contains the N-by-N upper triangular matrix T;
> if N > P, the elements on and above the (N-P)-th subdiagonal
> contain the N-by-P upper trapezoidal matrix T; the remaining
> elements, with the array TAUB, represent the orthogonal
> matrix Z as a product of elementary reflectors (see Further
> Details).

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

TAUB : REAL array, dimension (min(N,P)) [out]
> The scalar factors of the elementary reflectors which
> represent the orthogonal matrix Z (see Further Details).

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,N,M,P).
> For optimum performance LWORK >= max(N,M,P)\*max(NB1,NB2,NB3),
> where NB1 is the optimal blocksize for the QR factorization
> of an N-by-M matrix, NB2 is the optimal blocksize for the
> RQ factorization of an N-by-P matrix, and NB3 is the optimal
> blocksize for a call of SORMQR.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
