```fortran
subroutine dgesvd (
        character jobu,
        character jobvt,
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) s,
        double precision, dimension( ldu, * ) u,
        integer ldu,
        double precision, dimension( ldvt, * ) vt,
        integer ldvt,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DGESVD computes the singular value decomposition (SVD) of a real
M-by-N matrix A, optionally computing the left and/or right singular
vectors. The SVD is written

A = U \* SIGMA \* transpose(V)

where SIGMA is an M-by-N matrix which is zero except for its
min(m,n) diagonal elements, U is an M-by-M orthogonal matrix, and
V is an N-by-N orthogonal matrix.  The diagonal elements of SIGMA
are the singular values of A; they are real and non-negative, and
are returned in descending order.  The first min(m,n) columns of
U and V are the left and right singular vectors of A.

Note that the routine returns V\*\*T, not V.

## Parameters
JOBU : CHARACTER\*1 [in]
> Specifies options for computing all or part of the matrix U:
> = 'A':  all M columns of U are returned in array U:
> = 'S':  the first min(m,n) columns of U (the left singular
> vectors) are returned in the array U;
> = 'O':  the first min(m,n) columns of U (the left singular
> vectors) are overwritten on the array A;
> = 'N':  no columns of U (no left singular vectors) are
> computed.

JOBVT : CHARACTER\*1 [in]
> Specifies options for computing all or part of the matrix
> V\*\*T:
> = 'A':  all N rows of V\*\*T are returned in the array VT;
> = 'S':  the first min(m,n) rows of V\*\*T (the right singular
> vectors) are returned in the array VT;
> = 'O':  the first min(m,n) rows of V\*\*T (the right singular
> vectors) are overwritten on the array A;
> = 'N':  no rows of V\*\*T (no right singular vectors) are
> computed.
> 
> JOBVT and JOBU cannot both be 'O'.

M : INTEGER [in]
> The number of rows of the input matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the input matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit,
> if JOBU = 'O',  A is overwritten with the first min(m,n)
> columns of U (the left singular vectors,
> stored columnwise);
> if JOBVT = 'O', A is overwritten with the first min(m,n)
> rows of V\*\*T (the right singular vectors,
> stored rowwise);
> if JOBU .ne. 'O' and JOBVT .ne. 'O', the contents of A
> are destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

S : DOUBLE PRECISION array, dimension (min(M,N)) [out]
> The singular values of A, sorted so that S(i) >= S(i+1).

U : DOUBLE PRECISION array, dimension (LDU,UCOL) [out]
> (LDU,M) if JOBU = 'A' or (LDU,min(M,N)) if JOBU = 'S'.
> If JOBU = 'A', U contains the M-by-M orthogonal matrix U;
> if JOBU = 'S', U contains the first min(m,n) columns of U
> (the left singular vectors, stored columnwise);
> if JOBU = 'N' or 'O', U is not referenced.

LDU : INTEGER [in]
> The leading dimension of the array U.  LDU >= 1; if
> JOBU = 'S' or 'A', LDU >= M.

VT : DOUBLE PRECISION array, dimension (LDVT,N) [out]
> If JOBVT = 'A', VT contains the N-by-N orthogonal matrix
> V\*\*T;
> if JOBVT = 'S', VT contains the first min(m,n) rows of
> V\*\*T (the right singular vectors, stored rowwise);
> if JOBVT = 'N' or 'O', VT is not referenced.

LDVT : INTEGER [in]
> The leading dimension of the array VT.  LDVT >= 1; if
> JOBVT = 'A', LDVT >= N; if JOBVT = 'S', LDVT >= min(M,N).

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK;
> if INFO > 0, WORK(2:MIN(M,N)) contains the unconverged
> superdiagonal elements of an upper bidiagonal matrix B
> whose diagonal is in S (not necessarily sorted). B
> satisfies A = U \* B \* VT, so it has the same singular values
> as A, and singular vectors related by U and VT.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> LWORK >= MAX(1,5\*MIN(M,N)) for the paths (see comments inside code):
> - PATH 1  (M much larger than N, JOBU='N')
> - PATH 1t (N much larger than M, JOBVT='N')
> LWORK >= MAX(1,3\*MIN(M,N) + MAX(M,N),5\*MIN(M,N)) for the other paths
> For good performance, LWORK should generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if DBDSQR did not converge, INFO specifies how many
> superdiagonals of an intermediate bidiagonal form B
> did not converge to zero. See the description of WORK
> above for details.
