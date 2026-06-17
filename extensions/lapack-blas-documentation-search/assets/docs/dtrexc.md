```fortran
subroutine dtrexc (
        character compq,
        integer n,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        integer ifst,
        integer ilst,
        double precision, dimension( * ) work,
        integer info
)
```

DTREXC reorders the real Schur factorization of a real matrix
A = Q\*T\*Q\*\*T, so that the diagonal block of T with row index IFST is
moved to row ILST.

The real Schur form T is reordered by an orthogonal similarity
transformation Z\*\*T\*T\*Z, and optionally the matrix Q of Schur vectors
is updated by postmultiplying it with Z.

T must be in Schur canonical form (as returned by DHSEQR), that is,
block upper triangular with 1-by-1 and 2-by-2 diagonal blocks; each
2-by-2 diagonal block has its diagonal elements equal and its
off-diagonal elements of opposite sign.

## Parameters
COMPQ : CHARACTER\*1 [in]
> = 'V':  update the matrix Q of Schur vectors;
> = 'N':  do not update Q.

N : INTEGER [in]
> The order of the matrix T. N >= 0.
> If N == 0 arguments ILST and IFST may be any value.

T : DOUBLE PRECISION array, dimension (LDT,N) [in,out]
> On entry, the upper quasi-triangular matrix T, in Schur
> Schur canonical form.
> On exit, the reordered upper quasi-triangular matrix, again
> in Schur canonical form.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

Q : DOUBLE PRECISION array, dimension (LDQ,N) [in,out]
> On entry, if COMPQ = 'V', the matrix Q of Schur vectors.
> On exit, if COMPQ = 'V', Q has been postmultiplied by the
> orthogonal transformation matrix Z which reorders T.
> If COMPQ = 'N', Q is not referenced.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= 1, and if
> COMPQ = 'V', LDQ >= max(1,N).

IFST : INTEGER [in,out]

ILST : INTEGER [in,out]
> 
> Specify the reordering of the diagonal blocks of T.
> The block with row index IFST is moved to row ILST, by a
> sequence of transpositions between adjacent blocks.
> On exit, if IFST pointed on entry to the second row of a
> 2-by-2 block, it is changed to point to the first row; ILST
> always points to the first row of the block in its final
> position (which may differ from its input value by +1 or -1).
> 1 <= IFST <= N; 1 <= ILST <= N.

WORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> = 1:  two adjacent blocks were too close to swap (the problem
> is very ill-conditioned); T may have been partially
> reordered, and ILST points to the first row of the
> current position of the block being moved.
